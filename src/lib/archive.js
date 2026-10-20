import { createWriteStream, createReadStream, mkdirSync, promises as fsp } from "node:fs";
import path from "node:path";
import { ZipArchive } from "archiver";
import { listMediaRows } from "./db";
import { UPLOAD_DIR } from "./uploads";

export const ARCHIVE_DIR = path.join(process.cwd(), "data", "archives");

function archiveItems(userId) {
	return listMediaRows(userId).filter((row) => row.archived && !row.trashed && !row.vaulted && !row.url);
}

export function entryName(item, used) {
	const ext = path.extname(item.filename) || "";
	let name = `${item.title}${ext}`;
	if (used.has(name.toLowerCase())) {
		let counter = 2;
		while (used.has(name.toLowerCase())) {
			name = `${item.title} (${counter})${ext}`;
			counter += 1;
		}
	}
	used.add(name.toLowerCase());
	return name;
}

export async function archiveZipPath(userId) {
	return path.join(ARCHIVE_DIR, `${userId}.zip`);
}

export async function syncArchiveZip(userId) {
	const items = archiveItems(userId).sort((a, b) => a.id - b.id);
	mkdirSync(ARCHIVE_DIR, { recursive: true });
	const zipPath = await archiveZipPath(userId);
	const tempPath = `${zipPath}.tmp`;

	if (items.length === 0) {
		for (const target of [tempPath, zipPath]) {
			await fsp.rm(target, { force: true });
		}
		return 0;
	}

	await new Promise((resolve, reject) => {
		const output = createWriteStream(tempPath);
		const zip = new ZipArchive({ zlib: { level: 9 } });
		output.on("close", resolve);
		output.on("error", reject);
		zip.on("error", reject);
		zip.pipe(output);
		const used = new Set();
		for (const item of items) {
			zip.append(createReadStream(path.join(UPLOAD_DIR, item.filename)), { name: entryName(item, used) });
		}
		zip.finalize();
	});
	await fsp.rm(zipPath, { force: true });
	await fsp.rename(tempPath, zipPath);
	return items.length;
}
