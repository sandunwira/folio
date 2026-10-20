import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "./uploads";

async function walkSize(dir) {
	let total = 0;
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) total += await walkSize(full);
		else if (entry.isFile()) {
			const stat = await fs.stat(full);
			total += stat.size;
		}
	}
	return total;
}

export async function computeUsedGb() {
	try {
		const bytes = await walkSize(UPLOAD_DIR);
		return Number((bytes / 1e9).toFixed(2));
	} catch {
		return null;
	}
}

async function safeWalkSize(dir) {
	try {
		return await walkSize(dir);
	} catch {
		return 0;
	}
}

async function statSize(file) {
	try {
		return (await fs.stat(file)).size;
	} catch {
		return 0;
	}
}

export async function computeStorageReport() {
	const dataDir = path.join(process.cwd(), "data");
	const database = (await statSize(path.join(process.cwd(), "folio.db"))) + (await statSize(path.join(process.cwd(), "folio.db-wal"))) + (await statSize(path.join(process.cwd(), "folio.db-shm")));
	return {
		uploads: await safeWalkSize(UPLOAD_DIR),
		thumbs: await safeWalkSize(path.join(dataDir, "thumbs")),
		backups: await safeWalkSize(path.join(dataDir, "backups")),
		exports: await safeWalkSize(path.join(dataDir, "exports")),
		database,
	};
}
