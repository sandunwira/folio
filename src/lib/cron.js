import fs from "node:fs";
import path from "node:path";
import { snapshotDb, listCronJobRows, touchCronJob, logEvent, getSettings, setSettings } from "./db";

export const BACKUP_DIR = path.join(process.cwd(), "data", "backups");
export const EXPORT_DIR = path.join(process.cwd(), "data", "exports");

export const CRON_JOB_TYPES = Object.freeze({
	snapshot: "Database snapshot",
	config_export: "Configuration export",
});

const INTERNAL_KEY_PATTERN = /^samples_seeded_/;
const CONFIG_KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

let cronRunning = false;

function ensureDirs() {
	fs.mkdirSync(BACKUP_DIR, { recursive: true });
	fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

function stamp() {
	const now = new Date();
	const pad = (value) => String(value).padStart(2, "0");
	return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export async function createSnapshot() {
	ensureDirs();
	const filename = `folio-snapshot-${stamp()}.db`;
	const dest = path.join(BACKUP_DIR, filename);
	await snapshotDb(dest);
	const stat = await fs.promises.stat(dest);
	return { filename, size: stat.size };
}

export async function exportConfigFile() {
	ensureDirs();
	const filename = `folio-config-${stamp()}.json`;
	const dest = path.join(EXPORT_DIR, filename);
	const payload = filterConfig(getSettings());
	const json = JSON.stringify({ folio_config_version: 1, exported_at: Date.now(), settings: payload }, null, 2);
	await fs.promises.writeFile(dest, json, "utf8");
	const stat = await fs.promises.stat(dest);
	return { filename, size: stat.size, path: dest };
}

export function filterConfig(settings) {
	const entries = Object.entries(settings ?? {}).filter(([key]) => CONFIG_KEY_PATTERN.test(key) && !INTERNAL_KEY_PATTERN.test(key));
	return Object.fromEntries(entries);
}

export function importConfig(text) {
	let parsed;
	try {
		parsed = JSON.parse(String(text));
	} catch {
		return { error: "That file is not valid JSON." };
	}
	const settings = parsed?.settings ?? parsed;
	if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
		return { error: "The configuration file has no settings object." };
	}
	const entries = filterConfig(settings);
	if (Object.keys(entries).length === 0) {
		return { error: "No recognisable Folio settings were found in that file." };
	}
	setSettings(entries);
	return { ok: true, count: Object.keys(entries).length };
}

function listDir(dirPath, predicate) {
	try {
		return fs.readdirSync(dirPath).filter(predicate).map((name) => {
			const stat = fs.statSync(path.join(dirPath, name));
			return { name, size: stat.size, created_at: stat.mtimeMs };
		}).sort((a, b) => b.created_at - a.created_at);
	} catch {
		return [];
	}
}

export function listSnapshots() {
	return listDir(BACKUP_DIR, (name) => name.endsWith(".db"));
}

export function listConfigExports() {
	return listDir(EXPORT_DIR, (name) => name.endsWith(".json"));
}

function safeFileName(name) {
	const base = path.basename(String(name ?? ""));
	if (!base || base.includes("..") || /^[.-]/.test(base)) return null;
	return base;
}

export function filePathFor(kind, name) {
	const base = safeFileName(name);
	if (!base) return null;
	const root = kind === "snapshot" ? BACKUP_DIR : EXPORT_DIR;
	const resolved = path.join(process.cwd(), "data", kind === "snapshot" ? "backups" : "exports", base);
	if (!resolved.startsWith(root)) return null;
	return resolved;
}

export function deleteFile(kind, name) {
	const resolved = filePathFor(kind, name);
	if (!resolved) return false;
	fs.rmSync(resolved, { force: true });
	return true;
}

export async function executeJobType(jobType) {
	if (jobType === "snapshot") return createSnapshot();
	if (jobType === "config_export") return exportConfigFile();
	return null;
}

export async function runDueCronJobs(now = Date.now()) {
	if (cronRunning) return;
	cronRunning = true;
	try {
		for (const job of listCronJobRows()) {
			if (!job.active) continue;
			if (now - job.last_run < job.interval_minutes * 60_000) continue;
			const result = await executeJobType(job.job_type);
			touchCronJob(job.id, now);
			if (result) logEvent("cronjob_ran", "system", `Scheduled job "${job.name}" produced ${result.filename}`);
		}
	} finally {
		cronRunning = false;
	}
}
