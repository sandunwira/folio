import Database from "better-sqlite3";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

let db = null;
const SCHEMA_VERSION = 4;

function connectDatabase() {
	db = new Database(path.join(process.cwd(), "folio.db"));
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");
	db.pragma("busy_timeout = 5000");
	const dbVersion = db.pragma("user_version", { simple: true });

	if (dbVersion < SCHEMA_VERSION) {
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
		CREATE TABLE IF NOT EXISTS media (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			filename TEXT NOT NULL,
			mime TEXT NOT NULL,
			size INTEGER NOT NULL,
			location TEXT NOT NULL DEFAULT '',
			created_at INTEGER NOT NULL
		);
		CREATE INDEX IF NOT EXISTS media_user_created ON media(user_id, created_at DESC);
		CREATE TABLE IF NOT EXISTS albums (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS album_media (
			album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
			media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
			created_at INTEGER NOT NULL,
			PRIMARY KEY (album_id, media_id)
		);
		CREATE INDEX IF NOT EXISTS album_media_media ON album_media(media_id);
	`);

		for (const statement of [
			"ALTER TABLE media ADD COLUMN url TEXT",
			"ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1",
			"ALTER TABLE media ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0",
			"ALTER TABLE media ADD COLUMN archived INTEGER NOT NULL DEFAULT 0",
			"ALTER TABLE media ADD COLUMN vaulted INTEGER NOT NULL DEFAULT 0",
			"ALTER TABLE media ADD COLUMN trashed INTEGER NOT NULL DEFAULT 0",
			"ALTER TABLE media ADD COLUMN deleted_at INTEGER NOT NULL DEFAULT 0",
			"ALTER TABLE media ADD COLUMN est_location TEXT",
			"ALTER TABLE media ADD COLUMN est_city TEXT",
			"ALTER TABLE media ADD COLUMN est_district TEXT",
			"ALTER TABLE media ADD COLUMN est_state TEXT",
			"ALTER TABLE media ADD COLUMN est_country TEXT",
		]) {
			try {
				db.exec(statement);
			} catch (error) {
				if (!String(error).includes("duplicate column")) throw error;
			}
		}

		db.prepare("DELETE FROM media WHERE user_id NOT IN (SELECT id FROM users)").run();
		db.prepare("DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users)").run();

		db.pragma(`user_version = ${SCHEMA_VERSION}`);
	}

	db.exec(`
		CREATE TABLE IF NOT EXISTS cron_jobs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			job_type TEXT NOT NULL,
			interval_minutes INTEGER NOT NULL DEFAULT 1440,
			active INTEGER NOT NULL DEFAULT 1,
			last_run INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL
		);
	`);

	for (const job of [
		{ name: "DB Snapshot Job", jobType: "snapshot", intervalMinutes: 120 },
		{ name: "Configuration Snapshot Job", jobType: "config_export", intervalMinutes: 120 },
	]) {
		if (!db.prepare("SELECT id FROM cron_jobs WHERE job_type = ?").get(job.jobType)) {
			db.prepare("INSERT INTO cron_jobs (name, job_type, interval_minutes, active, last_run, created_at) VALUES (?, ?, ?, 1, 0, ?)").run(job.name, job.jobType, job.intervalMinutes, Date.now());
		}
	}

	try {
		db.exec("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
	} catch (error) {
		if (!String(error).includes("duplicate column")) throw error;
	}
}

connectDatabase();

const DEFAULT_SETTINGS = {
	app_name: "Folio",
	maintenance: "off",
	session_days: "30",
	quota_gb: "15",
	used_gb: "5.7",
	trash_days: "60",
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
	return db.prepare("SELECT id, username, display_name, is_admin, active, created_at FROM users ORDER BY is_admin DESC, created_at ASC").all();
}

export function recentUsers(limit) {
	return db.prepare("SELECT id, username, display_name, is_admin, active, created_at FROM users ORDER BY created_at DESC LIMIT ?").all(limit);
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

export function countActiveAdmins() {
	return db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_admin = 1 AND active = 1").get().c;
}

export function setUserActive(id, active) {
	db.prepare("UPDATE users SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
}

export function deleteSessionsByUserId(userId) {
	db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export function countAdmins() {
	return db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_admin = 1").get().c;
}

export function createSessionRow(token, userId, expiresAt) {
	db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt);
}

export function getSessionByToken(token) {
	return db.prepare(`
		SELECT u.id, u.username, u.display_name, u.is_admin, u.active, u.created_at, s.token, s.expires_at
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
		if (type === "media") {
			return db.prepare("SELECT id, type, actor, detail, created_at FROM events WHERE type LIKE 'media%' ORDER BY created_at DESC LIMIT ?").all(limit);
		}
		return db.prepare("SELECT id, type, actor, detail, created_at FROM events WHERE type = ? ORDER BY created_at DESC LIMIT ?").all(type, limit);
	}
	return db.prepare("SELECT id, type, actor, detail, created_at FROM events ORDER BY created_at DESC LIMIT ?").all(limit);
}

export function insertMediaRow({ userId, title, filename, mime, size, location = "", est = null, url = null, favorite = 0, archived = 0, createdAt = null }) {
	const info = db.prepare("INSERT INTO media (user_id, title, filename, mime, size, location, est_location, est_city, est_district, est_state, est_country, url, favorite, archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(userId, title, filename, mime, size, location, est?.location ?? null, est?.city ?? null, est?.district ?? null, est?.state ?? null, est?.country ?? null, url, favorite ? 1 : 0, archived ? 1 : 0, createdAt ?? Date.now());
	return db.prepare("SELECT * FROM media WHERE id = ?").get(info.lastInsertRowid);
}

export function setMediaLocation(id, location) {
	db.prepare("UPDATE media SET location = ? WHERE id = ?").run(location);
}

export function setMediaEstLocation(id, est) {
	if (!est) return;
	db.prepare("UPDATE media SET est_location = ?, est_city = ?, est_district = ?, est_state = ?, est_country = ? WHERE id = ?").run(est.location ?? null, est.city ?? null, est.district ?? null, est.state ?? null, est.country ?? null, id);
}

export function listMediaRows(userId) {
	return db.prepare("SELECT * FROM media WHERE user_id = ? ORDER BY created_at DESC, id DESC").all(userId);
}

export function getMediaRow(id) {
	return db.prepare("SELECT * FROM media WHERE id = ?").get(id);
}

export function deleteMediaRow(id) {
	const row = db.prepare("SELECT * FROM media WHERE id = ?").get(id);
	if (row) db.prepare("DELETE FROM media WHERE id = ?").run(id);
	return row ?? null;
}

export function setMediaFavorite(id, favorite) {
	db.prepare("UPDATE media SET favorite = ? WHERE id = ?").run(favorite ? 1 : 0, id);
}

export function setMediaArchived(id, archived) {
	db.prepare("UPDATE media SET archived = ? WHERE id = ?").run(archived ? 1 : 0, id);
}

export function setMediaVaulted(id, vaulted) {
	db.prepare("UPDATE media SET vaulted = ? WHERE id = ?").run(vaulted ? 1 : 0, id);
}

export function setMediaTrashed(id, trashed) {
	db.prepare("UPDATE media SET trashed = ?, deleted_at = ? WHERE id = ?").run(trashed ? 1 : 0, trashed ? Date.now() : 0, id);
}

export function listExpiredTrashRows(userId, days = 60) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	return db.prepare("SELECT * FROM media WHERE user_id = ? AND trashed = 1 AND deleted_at > 0 AND deleted_at < ?").all(userId, cutoff);
}

export function listExpiredTrashRowsAll(days = 60) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	return db.prepare("SELECT * FROM media WHERE trashed = 1 AND deleted_at > 0 AND deleted_at < ?").all(cutoff);
}

export function createAlbum(userId, name) {
	const info = db.prepare("INSERT INTO albums (user_id, name, created_at) VALUES (?, ?, ?)").run(userId, name, Date.now());
	return db.prepare("SELECT * FROM albums WHERE id = ?").get(info.lastInsertRowid);
}

export function getAlbum(userId, albumId) {
	return db.prepare("SELECT id, user_id, name, created_at FROM albums WHERE id = ? AND user_id = ?").get(albumId, userId) ?? null;
}

export function listAlbums(userId) {
	return db.prepare(`
		SELECT a.id, a.name, a.created_at,
			(SELECT COUNT(*) FROM album_media am WHERE am.album_id = a.id) AS item_count,
			(SELECT am.media_id FROM album_media am WHERE am.album_id = a.id ORDER BY am.created_at DESC, am.media_id DESC LIMIT 1) AS cover_media_id
		FROM albums a WHERE a.user_id = ? ORDER BY a.created_at DESC, a.id DESC
	`).all(userId);
}

export function listAlbumMediaRows(albumId, userId) {
	return db.prepare(`
		SELECT m.* FROM album_media am
		JOIN media m ON m.id = am.media_id
		WHERE am.album_id = ? AND m.user_id = ? AND m.trashed = 0
		ORDER BY m.created_at DESC, m.id DESC
	`).all(albumId, userId);
}

export function addAlbumMedia(albumId, mediaId) {
	db.prepare("INSERT OR IGNORE INTO album_media (album_id, media_id, created_at) VALUES (?, ?, ?)").run(albumId, mediaId, Date.now());
}

export function removeAlbumMedia(albumId, mediaId) {
	db.prepare("DELETE FROM album_media WHERE album_id = ? AND media_id = ?").run(albumId, mediaId);
}

export function renameAlbum(id, name) {
	db.prepare("UPDATE albums SET name = ? WHERE id = ?").run(name, id);
}

export function deleteAlbumRow(albumId) {
	db.prepare("DELETE FROM albums WHERE id = ?").run(albumId);
}

export function renameMedia(id, title) {
	db.prepare("UPDATE media SET title = ? WHERE id = ?").run(title, id);
}

export function sumMediaBytes(userId) {
	return db.prepare("SELECT COALESCE(SUM(size), 0) AS c FROM media WHERE user_id = ?").get(userId).c;
}

export function countMediaRows(userId) {
	return db.prepare("SELECT COUNT(*) AS c FROM media WHERE user_id = ?").get(userId).c;
}

export function snapshotDb(destination) {
	return db.backup(destination);
}

export function validateDatabaseFile(sourcePath) {
	let test = null;
	try {
		test = new Database(sourcePath, { readonly: true });
		const integrity = test.pragma("integrity_check", { simple: true });
		if (integrity && String(integrity).toLowerCase() !== "ok") throw new Error("The uploaded file is not a healthy SQLite database.");
		const tables = test.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
		const missing = ["users", "sessions", "settings", "media"].filter((name) => !tables.includes(name));
		if (missing.length > 0) throw new Error(`The uploaded database is missing required tables: ${missing.join(", ")}.`);
	} catch (error) {
		if (error.message.startsWith("SQLITE_NOTADB") || /file is not a database/i.test(String(error))) throw new Error("The uploaded file is not a SQLite database.");
		throw error;
	} finally {
		try {
			test?.close();
		} catch { }
	}
}

export function swapDatabaseFile(sourcePath) {
	const root = process.cwd();
	const now = new Date();
	const pad = (value) => String(value).padStart(2, "0");
	const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
	fs.mkdirSync(path.join(root, "data", "backups"), { recursive: true });
	return db.backup(path.join(root, "data", "backups", `folio-pre-restore-${stamp}.db`)).then(() => {
		db.close();
		for (const suffix of ["-wal", "-shm"]) {
			try {
				fs.unlinkSync(path.join(root, `folio.db${suffix}`));
			} catch { }
		}
		fs.copyFileSync(sourcePath, path.join(root, "folio.db"));
		connectDatabase();
	});
}

export function listCronJobRows() {
	return db.prepare("SELECT * FROM cron_jobs ORDER BY created_at DESC, id DESC").all();
}

export function getCronJobRow(id) {
	return db.prepare("SELECT * FROM cron_jobs WHERE id = ?").get(id);
}

export function setActiveCronJob(id, active) {
	db.prepare("UPDATE cron_jobs SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
}

export function touchCronJob(id, at) {
	db.prepare("UPDATE cron_jobs SET last_run = ? WHERE id = ?").run(at, id);
}
