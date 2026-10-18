import Database from "better-sqlite3";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import path from "node:path";

const db = new Database(path.join(process.cwd(), "folio.db"));
db.pragma("journal_mode = WAL");
db.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE COLLATE NOCASE,
			display_name TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			is_admin INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS sessions (
			token TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			type TEXT NOT NULL,
			actor TEXT,
			detail TEXT NOT NULL,
			created_at INTEGER NOT NULL
		);
	`);


const DEFAULT_SETTINGS = {
	maintenance: "off",
	session_days: "30",
	quota_gb: "15",
	used_gb: "5.7",
};

export const SESSION_COOKIE = "folio_session";
export const SESSION_DAYS = 30;

export function hashPassword(password) {
	const salt = randomBytes(16).toString("hex");
	return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, stored) {
	const [salt, key] = stored.split(":");
	if (!salt || !key) return false;
	const derived = scryptSync(password, salt, 64);
	const expected = Buffer.from(key, "hex");
	return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function countUsers() {
	return db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
}

export function getUserByUsername(username) {
	return db.prepare("SELECT * FROM users WHERE username = ?").get(username);
}

export function getUserById(id) {
	return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

export function listUsers() {
	return db.prepare("SELECT id, username, display_name, is_admin, created_at FROM users ORDER BY is_admin DESC, created_at ASC").all();
}

export function recentUsers(limit) {
	return db.prepare("SELECT id, username, display_name, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT ?").all(limit);
}

export function countActiveSessions() {
	return db.prepare("SELECT COUNT(*) AS c FROM sessions WHERE expires_at > CAST(strftime('now') AS REAL) * 1000").get().c;
}

export function createUser({ username, displayName, password, isAdmin = false }) {
	const info = db.prepare("INSERT INTO users (username, display_name, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?)").run(username, displayName, hashPassword(password), isAdmin ? 1 : 0, Date.now());
	return db.prepare("SELECT id, username, display_name, is_admin FROM users WHERE id = ?").get(info.lastInsertRowid);
}

export function deleteUser(id) {
	db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function countAdmins() {
	return db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_admin = 1").get().c;
}

export function createSessionRow(token, userId, expiresAt) {
	db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt);
}

export function getSessionByToken(token) {
	return db.prepare(`
		SELECT u.id, u.username, u.display_name, u.is_admin, u.created_at, s.token, s.expires_at
		FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?
	`).get(token);
}

export function deleteSessionByToken(token) {
	db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function deleteExpiredSessions() {
	db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
}

export function getSettings() {
	const rows = db.prepare("SELECT key, value FROM settings").all();
	const settings = { ...DEFAULT_SETTINGS };
	for (const row of rows) settings[row.key] = row.value;
	return settings;
}

export function setSettings(entries) {
	const upsert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
	const run = db.transaction((items) => {
		for (const [key, value] of Object.entries(items)) upsert.run(key, String(value));
	});
	run(entries);
}

export function logEvent(type, actor, detail) {
	db.prepare("INSERT INTO events (type, actor, detail, created_at) VALUES (?, ?, ?, ?)").run(type, actor, detail, Date.now());
}

export function listEvents(limit = 100, type) {
	if (type) {
		return db.prepare("SELECT id, type, actor, detail, created_at FROM events WHERE type = ? ORDER BY created_at DESC LIMIT ?").all(type, limit);
	}
	return db.prepare("SELECT id, type, actor, detail, created_at FROM events ORDER BY created_at DESC LIMIT ?").all(limit);
}
