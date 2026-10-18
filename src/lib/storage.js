import fs from "node:fs/promises";
import path from "node:path";

export const uploadsDir = path.join(process.cwd(), "data", "uploads");

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
		const bytes = await walkSize(uploadsDir);
		return Number((bytes / 1e9).toFixed(2));
	} catch {
		return null;
	}
}
