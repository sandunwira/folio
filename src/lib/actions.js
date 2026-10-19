"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { checkLogin, countAdmins, countUsers, createAlbum, createSession, createUser, deleteAlbumRow, deleteMediaRow, destroySession, deleteUser, getAlbum, getMediaRow, getSettings, getSessionUser, getUserByUsername, getUserById, listEvents, logEvent, renameAlbum, renameMedia, addAlbumMedia, removeAlbumMedia, setMediaArchived, setMediaFavorite, setMediaTrashed, setMediaVaulted, setSettings } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/uploads";

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
	const quotaGb = Number(formData.get("quotaGb"));

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
	return { ok: true, vaulted: !row.vaulted };
}

export async function moveToArchiveAction(photoId) {
	const user = await getSessionUser();
	if (!user) return { ok: false, error: "Sign in first." };
	const row = ownMedia(user, Number(photoId));
	if (!row) return { ok: false, error: "Item not found." };
	setMediaArchived(row.id, !row.archived);
	logEvent(row.archived ? "media_unarchived" : "media_archived", user.username, row.archived ? `Removed "${row.title}" from the archive` : `Archived "${row.title}"`);
	return { ok: true, archived: !row.archived };
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
		if (!row.url && row.filename) {
			await unlink(path.join(UPLOAD_DIR, row.filename)).catch(() => { });
		}
		deleteMediaRow(row.id);
		logEvent("media_deleted", user.username, `Permanently deleted "${row.title}"`);
	} else {
		setMediaTrashed(row.id, 1);
		logEvent("media_trashed", user.username, `Moved "${row.title}" to Trash`);
	}
	return { ok: true, trashed: !row.trashed };
}
