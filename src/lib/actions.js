"use server";

import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import AdmZip from "adm-zip";
import { MAX_VAULT_ATTEMPTS, addAlbumMedia, checkLogin, clearVaultPin, countActiveAdmins, countAdmins, countUsers, createAlbum, createSession, createUser, deleteAlbumRow, deleteMediaRow, deleteSessionsByUserId, destroySession, deleteUser, getAlbum, getMediaRow, getSettings, getSessionUser, getUserByUsername, getUserById, grantVaultAccess, hashPassword, insertMediaRow, listAlbums, listEvents, listMediaRows, logEvent, renameAlbum, renameMedia, removeAlbumMedia, setMediaArchived, setMediaFavorite, setMediaTrashed, setMediaVaulted, setSettings, setUserActive, setVaultAttempts, setVaultPin, verifyPassword } from "@/lib/auth";
import { THUMB_DIR, UPLOAD_DIR } from "@/lib/uploads";
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
	if (user.active === 0) {
		logEvent("login_failed", username, "Sign-in attempt on a deactivated account");
		redirect(loginErrorPath("This account has been deactivated. Contact the admin to activate your account."));
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

export async function toggleUserActiveAction(formData) {
	const session = await getSessionUser();
	if (!session?.isAdmin) redirect("/");
	const id = Number(formData.get("id"));
	const target = id ? getUserById(id) : null;
	if (!target) return { ok: false, error: "Account not found." };
	const activating = target.active !== 1;
	if (!activating && target.id === session.id) return { ok: false, error: "You cannot deactivate your own account." };
	if (!activating && target.is_admin && countActiveAdmins() <= 1) return { ok: false, error: "Cannot deactivate the last active admin." };
	setUserActive(target.id, activating ? 1 : 0);
	if (!activating) deleteSessionsByUserId(target.id);
	revalidatePath("/dashboard/users");
	logEvent(activating ? "account_activated" : "account_deactivated", session.username, `${activating ? "Activated" : "Deactivated"} account "${target.username}"`);
	return { ok: true, active: activating };
}

export async function resetUserPasswordAction(formData) {
	const session = await getSessionUser();
	if (!session?.isAdmin) redirect("/");
	const id = Number(formData.get("id"));
	const newPassword = String(formData.get("newPassword") ?? "");
	const target = id ? getUserById(id) : null;
	if (!target) return { ok: false, error: "Account not found." };
	if (newPassword.length < 6) return { ok: false, error: "New password must be at least 6 characters." };
	setUserPasswordRow(target.id, hashPassword(newPassword));
	if (target.id !== session.id) deleteSessionsByUserId(target.id);
	revalidatePath("/dashboard/users");
	logEvent("password_reset", session.username, `Reset the password for "${target.username}"${target.id === session.id ? "" : " — their sessions were signed out"}`);
	return { ok: true };
}

const pinPattern = /^\d{4}$/;

export async function setupVaultPinAction(formData) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const pin = String(formData.get("pin") ?? "");
	const confirm = String(formData.get("confirm") ?? "");
	if (!pinPattern.test(pin) || !pinPattern.test(confirm)) return { ok: false, error: "Enter exactly 4 digits." };
	if (pin !== confirm) return { ok: false, error: "PINs do not match." };
	setVaultPin(user.id, hashPassword(pin));
	logEvent("vault_pin_set", user.username, "Configured a vault PIN");
	await grantVaultAccess(user.id);
	revalidatePath("/vault");
	return { ok: true };
}

export async function unlockVaultAction(formData) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const account = user.id ? getUserById(user.id) : null;
	if (!account?.vault_pin_hash) return { ok: false, error: "No vault PIN is configured. Set up a PIN first." };
	if (account.vault_attempts >= MAX_VAULT_ATTEMPTS) {
		logEvent("vault_locked", user.username, "Vault unlock attempt while locked out");
		return { ok: false, locked: true, error: "Vault is locked after too many failed attempts." };
	}
	const pin = String(formData.get("pin") ?? "");
	if (pinPattern.test(pin) && verifyPassword(pin, account.vault_pin_hash)) {
		setVaultAttempts(user.id, 0);
		logEvent("vault_unlocked", user.username, "Unlocked the vault");
		await grantVaultAccess(user.id);
		revalidatePath("/vault");
		return { ok: true };
	}
	const attempts = account.vault_attempts + 1;
	setVaultAttempts(user.id, attempts);
	logEvent("vault_unlock_failed", user.username, `Failed vault unlock attempt (${attempts}/${MAX_VAULT_ATTEMPTS})`);
	if (attempts >= MAX_VAULT_ATTEMPTS) {
		logEvent("vault_locked", user.username, `Vault locked after ${attempts} failed attempts`);
		return { ok: false, locked: true, attemptsLeft: 0, error: "Vault is locked after too many failed attempts." };
	}
	return { ok: false, attemptsLeft: MAX_VAULT_ATTEMPTS - attempts, error: `Incorrect PIN. ${MAX_VAULT_ATTEMPTS - attempts} attempt${MAX_VAULT_ATTEMPTS - attempts === 1 ? "" : "s"} left.` };
}

export async function resetVaultPinAction(formData) {
	const session = await getSessionUser();
	if (!session?.isAdmin) redirect("/");
	const id = Number(formData.get("id"));
	const target = id ? getUserById(id) : null;
	if (!target) return { ok: false, error: "Account not found." };
	if (!target.vault_pin_hash && target.vault_attempts >= MAX_VAULT_ATTEMPTS) return { ok: false, error: "No vault PIN is configured for this account." };
	clearVaultPin(target.id);
	revalidatePath("/dashboard/users");
	logEvent("vault_pin_reset", session.username, `Reset the vault PIN for "${target.username}" — they can set up a new PIN`);
	return { ok: true };
}

export async function deactivateSelfAction() {
	const session = await getSessionUser();
	if (!session) redirect("/login");
	if (session.isAdmin && countActiveAdmins() <= 1) return { ok: false, error: "Cannot deactivate the last active admin." };
	setUserActive(session.id, 0);
	logEvent("account_deactivated", session.username, `Deactivated own account (${session.username})`);
	return { ok: true };
}

export async function clearPersonalDataAction() {
	const session = await getSessionUser();
	if (!session) redirect("/login");
	const rows = listMediaRows(session.id);
	for (const row of rows) {
		if (!row.url && row.filename) {
			await unlink(path.join(UPLOAD_DIR, row.filename)).catch(() => { });
		}
		await unlink(path.join(THUMB_DIR, `${row.id}.jpg`)).catch(() => { });
		deleteMediaRow(row.id);
	}
	for (const album of listAlbums(session.id)) {
		deleteAlbumRow(album.id);
	}
	await syncArchiveZip(session.id);
	logEvent("data_cleared", session.username, `Cleared all personal data (${rows.length} item${rows.length === 1 ? "" : "s"}, albums, uploaded files)`);
	revalidatePath("/");
	return { ok: true, count: rows.length };
}

export async function importPersonalDataAction(formData) {
	const session = await getSessionUser();
	if (!session) redirect("/login");
	const file = formData.get("data");
	if (!file || typeof file === "string") return { ok: false, error: "Choose a Folio data export (.zip) to import." };
	const fileName = String(file.name ?? "").toLowerCase();
	const isZip = fileName.endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed";
	if (!isZip) return { ok: false, error: "The import file must be a Folio data export (.zip)." };

	let zip;
	try {
		zip = new AdmZip(Buffer.from(await file.arrayBuffer()));
	} catch {
		return { ok: false, error: "That file is not a valid ZIP archive." };
	}
	const manifestEntry = zip.getEntry("folio-data.json");
	if (!manifestEntry) return { ok: false, error: "That ZIP has no folio-data.json inside — it is not a Folio data export." };
	let parsed;
	try {
		parsed = JSON.parse(zip.readAsText(manifestEntry));
	} catch {
		return { ok: false, error: "folio-data.json inside that ZIP is not valid JSON." };
	}
	if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.media)) return { ok: false, error: "That export has no media data to import." };

	await mkdir(UPLOAD_DIR, { recursive: true });
	const existing = new Set(listMediaRows(session.id).map((row) => row.filename || `url:${row.url}`));
	const filenameToId = new Map();
	let imported = 0;
	for (const item of parsed.media) {
		const rawFilename = typeof item?.filename === "string" ? item.filename : "";
		const filename = rawFilename && path.basename(rawFilename) === rawFilename && rawFilename !== "." && rawFilename !== ".." ? rawFilename : "";
		const url = typeof item?.url === "string" && item.url ? item.url : null;
		const dedupeKey = filename || (url ? `url:${url}` : "");
		if (!dedupeKey || existing.has(dedupeKey)) continue;
		const row = insertMediaRow({
			userId: session.id,
			title: String(item.title || "Untitled").slice(0, 200),
			filename,
			mime: String(item.mime || "application/octet-stream"),
			size: Number(item.size) || 0,
			location: typeof item.location === "string" ? item.location : "",
			url,
			favorite: item.favorite ? 1 : 0,
			archived: item.archived ? 1 : 0,
			createdAt: Number.isFinite(Number(item.created_at)) ? Number(item.created_at) : null,
		});
		setMediaArchived(row.id, !!item.archived);
		setMediaVaulted(row.id, !!item.vaulted);
		if (item.trashed) setMediaTrashed(row.id, true);
		existing.add(dedupeKey);
		if (filename) filenameToId.set(filename, row.id);
		if (filename) {
			const targetPath = path.join(UPLOAD_DIR, filename);
			const fileStat = await stat(targetPath).catch(() => null);
			if (!fileStat) {
				const zipEntry = zip.getEntry(`uploads/${filename}`);
				if (zipEntry) await writeFile(targetPath, zip.readFile(zipEntry));
			}
		}
		imported++;
	}
	let albumCount = 0;
	for (const album of Array.isArray(parsed.albums) ? parsed.albums : []) {
		const name = String(album?.name || "").trim().slice(0, 120);
		if (!name) continue;
		let albumRow = listAlbums(session.id).find((candidate) => candidate.name.toLowerCase() === name.toLowerCase());
		if (!albumRow) {
			albumRow = createAlbum(session.id, name);
			albumCount++;
		}
		for (const itemId of Array.isArray(album.items) ? album.items : []) {
			const mediaId = filenameToId.get(String(itemId));
			if (mediaId) addAlbumMedia(albumRow.id, mediaId);
		}
	}
	await syncArchiveZip(session.id);
	logEvent("data_imported", session.username, `Imported ${imported} media item${imported === 1 ? "" : "s"}${albumCount ? ` into ${albumCount} album${albumCount === 1 ? "" : "s"}` : ""} from "${file.name}"`);
	revalidatePath("/");
	return { ok: true, count: imported, albums: albumCount };
}

export async function deleteSelfAction() {
	const session = await getSessionUser();
	if (!session) redirect("/login");
	if (session.isAdmin && countAdmins() <= 1) return { ok: false, error: "Cannot delete the last admin." };
	const username = session.username;
	deleteUser(session.id);
	logEvent("account_deleted", username, `Deleted own account (${username})`);
	redirect("/login");
}

export async function deleteUserAction(formData) {
	const session = await getSessionUser();
	if (!session?.isAdmin) redirect("/");
	const id = Number(formData.get("id"));
	const target = id ? getUserById(id) : null;
	if (!target || target.id === session.id) return { ok: false, error: "You cannot delete your own account." };
	if (target.is_admin && countAdmins() <= 1) return { ok: false, error: "Cannot delete the last admin." };
	const deletedUsername = target.username;
	deleteUser(target.id);
	logEvent("account_deleted", session.username, `Deleted account "${deletedUsername}"`);
	revalidatePath("/dashboard/users");
	return { ok: true };
}

export async function updateAdminSettingsAction(formData) {
	const session = await getSessionUser();
	if (!session?.isAdmin) redirect("/");
	const maintenance = formData.get("maintenance") === "on";
	const sessionDays = Number(formData.get("sessionDays"));
	const currentQuota = Number(getSettings().quota_gb);
	const quotaInput = formData.get("quotaGb");
	const quotaGb = quotaInput === null ? currentQuota : Number(quotaInput);

	const failPath = (message) => `/settings?error=${encodeURIComponent(message)}`;
	if (!Number.isInteger(sessionDays) || sessionDays < 1 || sessionDays > 365) redirect(failPath("Session lifetime must be between 1 and 365 days."));
	if (!Number.isFinite(quotaGb) || quotaGb < 1) redirect(failPath("Storage quota must be at least 1 GB."));

	setSettings({ maintenance: maintenance ? "on" : "off", session_days: String(sessionDays), quota_gb: String(quotaGb) });
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

export async function bulkVaultAction(ids) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const rows = ownRows(user, ids);
	if (!rows.length) return { ok: false, error: "No items in your selection." };
	const vaulted = rows.every((row) => row.vaulted) ? 0 : 1;
	for (const row of rows) setMediaVaulted(row.id, vaulted);
	for (const userId of new Set(rows.filter((row) => row.archived).map((row) => row.user_id))) await syncArchiveZip(userId);
	logEvent(vaulted ? "media_vaulted" : "media_unvaulted", user.username, vaulted ? `Moved ${rows.length} item${rows.length === 1 ? "" : "s"} to the vault` : `Removed ${rows.length} item${rows.length === 1 ? "" : "s"} from the vault`);
	return { ok: true, vaulted: !!vaulted, count: rows.length };
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
