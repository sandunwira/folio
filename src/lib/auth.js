import { cookies } from "next/headers";
import { connection } from "next/server";
import { randomBytes } from "node:crypto";
import { SESSION_COOKIE, SESSION_DAYS, createSessionRow, deleteExpiredSessions, deleteSessionByToken, getSessionByToken, getUserByUsername, verifyPassword } from "./db";

export {
	countUsers,
	countActiveSessions,
	listUsers,
	recentUsers,
	createUser,
	deleteUser,
	countAdmins,
	getUserByUsername,
	getUserById,
	getSettings,
	setSettings,
	logEvent,
	listEvents,
	insertMediaRow,
	listMediaRows,
	getMediaRow,
	deleteMediaRow,
	setMediaFavorite,
	setMediaArchived,
	setMediaVaulted,
	setMediaTrashed,
	setMediaLocation,
	setMediaEstLocation,
	renameMedia,
	createAlbum,
	getAlbum,
	listAlbums,
	listAlbumMediaRows,
	addAlbumMedia,
	removeAlbumMedia,
	renameAlbum,
	deleteAlbumRow,
	sumMediaBytes,
} from "./db";

export async function createSession(userId, days = SESSION_DAYS) {
	const token = randomBytes(32).toString("hex");
	const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
	createSessionRow(token, userId, expiresAt);
	deleteExpiredSessions();
	const store = await cookies();
	store.set(SESSION_COOKIE, token, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: days * 24 * 60 * 60,
	});
}

export async function getSessionUser() {
	await connection();
	const store = await cookies();
	const token = store.get(SESSION_COOKIE)?.value;
	if (!token) return null;
	const row = getSessionByToken(token);
	if (!row) return null;
	if (row.expires_at < Date.now()) {
		deleteSessionByToken(token);
		return null;
	}
	return { id: row.id, username: row.username, name: row.display_name, isAdmin: row.is_admin === 1, createdAt: row.created_at };
}

export async function destroySession() {
	const store = await cookies();
	const token = store.get(SESSION_COOKIE)?.value;
	if (token) {
		deleteSessionByToken(token);
		store.delete(SESSION_COOKIE);
	}
}

export function checkLogin(username, password) {
	const user = getUserByUsername(username);
	if (!user) return null;
	return verifyPassword(password, user.password_hash) ? user : null;
}
