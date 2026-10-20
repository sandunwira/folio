"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkLogin, countAdmins, countUsers, createAlbum, createSession, createUser, deleteAlbumRow, deleteMediaRow, destroySession, deleteUser, getAlbum, getMediaRow, getSettings, getSessionUser, getUserByUsername, getUserById, listEvents, listMediaRows, logEvent, renameAlbum, renameMedia, addAlbumMedia, removeAlbumMedia, setMediaArchived, setMediaFavorite, setMediaTrashed, setMediaVaulted, setSettings } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/uploads";
import { syncArchiveZip } from "@/lib/archive";
import { BACKUP_DIR, EXPORT_DIR, CRON_JOB_TYPES, createSnapshot, deleteFile, executeJobType, exportConfigFile, importConfig } from "@/lib/cron";
import { getCronJobRow, setActiveCronJob, touchCronJob } from "@/lib/auth";

const usernamePattern = /^[a-z0-9_.-]{2,32}$/;

function loginErrorPath(message) {
	return `/login?error=${encodeURIComponent(message)}`;
}

export async function setupAdminAction(formData) {
	const name = String(formData.get("name") ?? "").trim();
	const username = String(formData.get("username") ?? "").trim().toLowerCase();
	const password = String(formData.get("password") ?? "");
	const confirm = String(formData.get("confirm") ?? "");

	if (!name) redirect(loginErrorPath("Please enter your name."));
	if (!usernamePattern.test(username)) redirect(loginErrorPath("Username must be 2-32 characters (a-z, 0-9, _ . -)."));
	if (password.length < 6) redirect(loginErrorPath("Password must be at least 6 characters."));
	if (password !== confirm) redirect(loginErrorPath("Passwords do not match."));
	if (countUsers() > 0) redirect(loginErrorPath("Administrator already exists. Please sign in."));

	const user = createUser({ username, displayName: name, password, isAdmin: true });
	logEvent("admin_bootstrapped", username, "First admin account created");
	await createSession(user.id, sessionLifetimeDays());
	redirect("/");
}

export async function loginAction(formData) {
	const username = String(formData.get("username") ?? "").trim().toLowerCase();
	const password = String(formData.get("password") ?? "");
	if (!username || !password) redirect(loginErrorPath("Please fill in both fields."));
	const user = checkLogin(username, password);
	if (!user) {
		logEvent("login_failed", username, "Failed sign-in attempt");
		redirect(loginErrorPath("Incorrect username or password."));
	}
	logEvent("login_success", username, "Signed in");
	await createSession(user.id, sessionLifetimeDays());
	redirect("/");
}

function sessionLifetimeDays() {
	const days = Number(getSettings().session_days);
	return Number.isInteger(days) && days >= 1 && days <= 365 ? days : 30;
}

export async function logoutAction() {
	const session = await getSessionUser();
	await destroySession();
	if (session) logEvent("logout", session.username, "Signed out");
	redirect("/login");
}

export async function createUserAction(formData) {
	const session = await getSessionUser();
	if (!session?.isAdmin) redirect("/");
	const name = String(formData.get("name") ?? "").trim();
	const username = String(formData.get("username") ?? "").trim().toLowerCase();
	const password = String(formData.get("password") ?? "");
	const makeAdmin = formData.get("admin") === "on";

	const failPath = (message) => `/dashboard/users?error=${encodeURIComponent(message)}`;
	if (!name) redirect(failPath("Please enter a display name."));
	if (!usernamePattern.test(username)) redirect(failPath("Username must be 2-32 characters (a-z, 0-9, _ . -)."));
	if (password.length < 6) redirect(failPath("Password must be at least 6 characters."));
	if (getUserByUsername(username)) redirect(failPath(`Username "${username}" is already taken.`));

	createUser({ username, displayName: name, password, isAdmin: makeAdmin });
	logEvent("account_created", session.username, `Created account "${username}"${makeAdmin ? " with admin role" : ""}`);
	redirect("/dashboard/users");
}

export async function deleteUserAction(formData) {
	const session = await getSessionUser();
	if (!session?.isAdmin) redirect("/");
	const id = Number(formData.get("id"));
	const target = id ? getUserById(id) : null;
	if (!target || target.id === session.id) redirect("/dashboard/users");
	if (target.is_admin && countAdmins() <= 1) redirect("/dashboard/users");
	const deletedUsername = target.username;
	deleteUser(target.id);
	logEvent("account_deleted", session.username, `Deleted account "${deletedUsername}"`);
	redirect("/dashboard/users");
}

export async function updateAdminSettingsAction(formData) {
	const session = await getSessionUser();
	if (!session?.isAdmin) redirect("/");
	const appName = String(formData.get("appName") ?? "").trim().slice(0, 40);
	const maintenance = formData.get("maintenance") === "on";
	const sessionDays = Number(formData.get("sessionDays"));
	const currentQuota = Number(getSettings().quota_gb);
	const quotaInput = formData.get("quotaGb");
	const quotaGb = quotaInput === null ? currentQuota : Number(quotaInput);

	const failPath = (message) => `/settings?error=${encodeURIComponent(message)}`;
	if (!appName) redirect(failPath("Please enter an archive name."));
	if (!Number.isInteger(sessionDays) || sessionDays < 1 || sessionDays > 365) redirect(failPath("Session lifetime must be between 1 and 365 days."));
	if (!Number.isFinite(quotaGb) || quotaGb < 1) redirect(failPath("Storage quota must be at least 1 GB."));

	setSettings({ app_name: appName, maintenance: maintenance ? "on" : "off", session_days: String(sessionDays), quota_gb: String(quotaGb) });
	logEvent("settings_updated", session.username, maintenance ? "Site settings updated (maintenance on)" : "Site settings updated");
	redirect("/settings?saved=1");
}

function ownMedia(user, id) {
	const row = Number.isInteger(id) ? getMediaRow(id) : null;
	if (!row) return null;
	if (row.user_id !== user.id && !user.isAdmin) return null;
	return row;
}

export async function toggleMediaFavoriteAction(photoId) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const row = ownMedia(user, Number(photoId));
	if (!row) return { ok: false, error: "Item not found." };
	setMediaFavorite(row.id, !row.favorite);
	logEvent(row.favorite ? "media_unfavorited" : "media_favorited", user.username, row.favorite ? `Removed "${row.title}" from favorites` : `Added "${row.title}" to favorites`);
	return { ok: true, favorite: !row.favorite };
}

export async function renameMediaAction(formData) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const row = ownMedia(user, Number(formData.get("id")));
	if (!row) return { ok: false, error: "Item not found." };
	const title = String(formData.get("title") ?? "").trim().slice(0, 120);
	if (!title) return { ok: false, error: "Name cannot be empty." };
	renameMedia(row.id, title);
	logEvent("media_renamed", user.username, `Renamed "${row.title}" to "${title}"`);
	return { ok: true };
}

export async function moveToVaultAction(photoId) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const row = ownMedia(user, Number(photoId));
	if (!row) return { ok: false, error: "Item not found." };
	setMediaVaulted(row.id, !row.vaulted);
	logEvent(row.vaulted ? "media_unvaulted" : "media_vaulted", user.username, row.vaulted ? `Removed "${row.title}" from the vault` : `Moved "${row.title}" to the vault`);
	if (row.archived) await syncArchiveZip(row.user_id);
	return { ok: true, vaulted: !row.vaulted };
}

export async function moveToArchiveAction(photoId) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const row = ownMedia(user, Number(photoId));
	if (!row) return { ok: false, error: "Item not found." };
	setMediaArchived(row.id, !row.archived);
	if (!row.archived && row.favorite) setMediaFavorite(row.id, 0);
	logEvent(row.archived ? "media_unarchived" : "media_archived", user.username, row.archived ? `Removed "${row.title}" from the archive` : `Archived "${row.title}"`);
	await syncArchiveZip(row.user_id);
	return { ok: true, archived: !row.archived };
}

function ownRows(user, ids) {
	const wanted = new Set((Array.isArray(ids) ? ids : []).map(Number).filter((id) => Number.isInteger(id)).slice(0, 500).map(String));
	return listMediaRows(user.id).filter((row) => wanted.has(String(row.id)));
}

export async function bulkFavoriteAction(ids) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const rows = ownRows(user, ids);
	if (!rows.length) return { ok: false, error: "No items in your selection." };
	const favorite = rows.every((row) => row.favorite) ? 0 : 1;
	for (const row of rows) setMediaFavorite(row.id, favorite);
	logEvent(favorite ? "media_favorited" : "media_unfavorited", user.username, favorite ? `Added ${rows.length} item${rows.length === 1 ? "" : "s"} to favorites` : `Removed ${rows.length} item${rows.length === 1 ? "" : "s"} from favorites`);
	return { ok: true, favorite: !!favorite, count: rows.length };
}

export async function bulkArchiveAction(ids) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const rows = ownRows(user, ids);
	if (!rows.length) return { ok: false, error: "No items in your selection." };
	const archived = rows.every((row) => row.archived) ? 0 : 1;
	for (const row of rows) setMediaArchived(row.id, archived);
	if (archived) {
		const favorited = rows.filter((row) => row.favorite);
		for (const row of favorited) setMediaFavorite(row.id, 0);
	}
	for (const userId of new Set(rows.map((row) => row.user_id))) await syncArchiveZip(userId);
	logEvent(archived ? "media_archived" : "media_unarchived", user.username, archived ? `Archived ${rows.length} item${rows.length === 1 ? "" : "s"}` : `Removed ${rows.length} item${rows.length === 1 ? "" : "s"} from the archive`);
	return { ok: true, archived: !!archived, count: rows.length };
}

export async function bulkTrashAction(ids) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const rows = ownRows(user, ids);
	if (!rows.length) return { ok: false, error: "No items in your selection." };
	for (const row of rows) setMediaTrashed(row.id, 1);
	for (const userId of new Set(rows.filter((row) => row.archived).map((row) => row.user_id))) await syncArchiveZip(userId);
	logEvent("media_trashed", user.username, `Moved ${rows.length} item${rows.length === 1 ? "" : "s"} to Trash`);
	return { ok: true, count: rows.length };
}

export async function restoreMediaAction(photoId) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const row = ownMedia(user, Number(photoId));
	if (!row) return { ok: false, error: "Item not found." };
	if (!row.trashed) return { ok: false, error: "Item is not in the trash." };
	setMediaTrashed(row.id, 0);
	if (row.archived) await syncArchiveZip(row.user_id);
	logEvent("media_restored", user.username, `Restored "${row.title}" from Trash`);
	return { ok: true };
}

export async function bulkRestoreAction(ids) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const rows = ownRows(user, ids).filter((row) => row.trashed);
	if (!rows.length) return { ok: false, error: "No items in your selection." };
	for (const row of rows) setMediaTrashed(row.id, 0);
	for (const userId of new Set(rows.filter((row) => row.archived).map((row) => row.user_id))) await syncArchiveZip(userId);
	logEvent("media_restored", user.username, `Restored ${rows.length} item${rows.length === 1 ? "" : "s"} from Trash`);
	return { ok: true, count: rows.length };
}

export async function bulkAddToAlbumAction(albumId, ids) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const album = getAlbum(user.id, Number(albumId));
	if (!album) return { ok: false, error: "Album not found." };
	const rows = ownRows(user, ids);
	if (!rows.length) return { ok: false, error: "No items in your selection." };
	for (const row of rows) addAlbumMedia(album.id, row.id);
	logEvent("media_added_to_album", user.username, `Added ${rows.length} item${rows.length === 1 ? "" : "s"} to "${album.name}"`);
	return { ok: true, count: rows.length };
}

export async function createAlbumAction(formData) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const name = String(formData.get("name") ?? "").trim().slice(0, 80);
	if (!name) return { ok: false, error: "Album name is required." };
	const album = createAlbum(user.id, name);
	logEvent("album_created", user.username, `Created album "${name}"`);
	return { ok: true, album: { id: album.id, name: album.name } };
}

export async function renameAlbumAction(formData) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const album = getAlbum(user.id, Number(formData.get("albumId")));
	if (!album) return { ok: false, error: "Album not found." };
	const name = String(formData.get("name") ?? "").trim().slice(0, 80);
	if (!name) return { ok: false, error: "Album name is required." };
	renameAlbum(album.id, name);
	logEvent("album_renamed", user.username, `Renamed album "${album.name}" to "${name}"`);
	return { ok: true };
}

export async function deleteAlbumAction(albumId) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const album = getAlbum(user.id, Number(albumId));
	if (!album) return { ok: false, error: "Album not found." };
	deleteAlbumRow(album.id);
	logEvent("album_deleted", user.username, `Deleted album "${album.name}"`);
	return { ok: true };
}

async function sharedAlbum(user, albumId) {
	return getAlbum(user.id, Number(albumId));
}

export async function addMediaToAlbumAction(albumId, photoId) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const album = await sharedAlbum(user, albumId);
	if (!album) return { ok: false, error: "Album not found." };
	const row = ownMedia(user, Number(photoId));
	if (!row) return { ok: false, error: "Item not found." };
	addAlbumMedia(album.id, row.id);
	logEvent("media_added_to_album", user.username, `Added "${row.title}" to "${album.name}"`);
	return { ok: true };
}

export async function removeMediaFromAlbumAction(albumId, photoId) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const album = await sharedAlbum(user, albumId);
	if (!album) return { ok: false, error: "Album not found." };
	const row = ownMedia(user, Number(photoId));
	if (!row) return { ok: false, error: "Item not found." };
	removeAlbumMedia(album.id, row.id);
	logEvent("media_removed_from_album", user.username, `Removed "${row.title}" from "${album.name}"`);
	return { ok: true };
}

export async function trashMediaAction(photoId) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const row = ownMedia(user, Number(photoId));
	if (!row) return { ok: false, error: "Item not found." };
	if (row.trashed) {
		if (row.archived) await syncArchiveZip(row.user_id);
		if (!row.url && row.filename) {
			await unlink(path.join(UPLOAD_DIR, row.filename)).catch(() => { });
		}
		deleteMediaRow(row.id);
		logEvent("media_deleted", user.username, `Permanently deleted "${row.title}"`);
	} else {
		setMediaTrashed(row.id, 1);
		if (row.archived) await syncArchiveZip(row.user_id);
		logEvent("media_trashed", user.username, `Moved "${row.title}" to Trash`);
	}
	return { ok: true, trashed: !row.trashed };
}

async function requireAdmin() {
	const user = await getSessionUser();
	return user?.isAdmin ? user : null;
}

function formatSize(bytes) {
	const units = ["B", "KB", "MB", "GB"];
	let value = Number(bytes) || 0;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function describeJobResult(jobType, result) {
	return `${CRON_JOB_TYPES[jobType]} — ${result?.filename ?? "done"}${result?.size != null ? ` (${formatSize(result.size)})` : ""}`;
}

export async function createSnapshotAction() {
	const user = await requireAdmin();
	if (!user) return { ok: false, error: "Admin access required." };
	const result = await createSnapshot();
	logEvent("snapshot_created", user.username, describeJobResult("snapshot", result));
	revalidatePath("/dashboard/import-export");
	revalidatePath("/dashboard/cronjobs");
	return { ok: true, count: 1 };
}

export async function deleteFileAction(kind, name) {
	const user = await requireAdmin();
	if (!user) return { ok: false, error: "Admin access required." };
	const removed = deleteFile(kind, name);
	if (removed) logEvent("server_file_deleted", user.username, `Deleted ${kind} file "${name}"`);
	revalidatePath("/dashboard/import-export");
	return { ok: removed, count: removed ? 1 : 0 };
}

export async function exportConfigAction() {
	const user = await requireAdmin();
	if (!user) return { ok: false, error: "Admin access required." };
	const result = await exportConfigFile();
	logEvent("config_exported", user.username, describeJobResult("config_export", result));
	revalidatePath("/dashboard/import-export");
	return { ok: true, path: result.path };
}

export async function importConfigAction(formData) {
	const user = await requireAdmin();
	if (!user) return { ok: false, error: "Admin access required." };
	const file = formData.get("config");
	if (!file || typeof file === "string") return { ok: false, error: "Choose a configuration JSON file to import." };
	const result = importConfig(await file.text());
	if (result.error) return result;
	logEvent("config_imported", user.username, `Imported configuration (${result.count} setting${result.count === 1 ? "" : "s"}) from "${file.name}"`);
	revalidatePath("/dashboard/import-export");
	revalidatePath("/settings");
	return { ok: true, count: result.count };
}

export async function toggleCronAction(id) {
	const user = await requireAdmin();
	if (!user) return { ok: false, error: "Admin access required." };
	const job = getCronJobRow(Number(id));
	if (!job) return { ok: false, error: "Job not found." };
	setActiveCronJob(job.id, !job.active);
	logEvent(job.active ? "cronjob_paused" : "cronjob_resumed", user.username, `${job.active ? "Paused" : "Resumed"} cron job "${job.name}"`);
	revalidatePath("/dashboard/cronjobs");
	return { ok: true, active: !job.active };
}

export async function runCronAction(id) {
	const user = await requireAdmin();
	if (!user) return { ok: false, error: "Admin access required." };
	const job = getCronJobRow(Number(id));
	if (!job) return { ok: false, error: "Job not found." };
	const result = await executeJobType(job.job_type);
	touchCronJob(job.id, Date.now());
	logEvent("cronjob_ran", user.username, `Manual run of "${job.name}" — ${describeJobResult(job.job_type, result)}`);
	revalidatePath("/dashboard/cronjobs");
	return { ok: true };
}
