const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const exifr = require("exifr");
const sharp = require("sharp");

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const THUMB_DIR = path.join(process.cwd(), "data", "thumbs");

(async () => {
	const db = new Database(path.join(process.cwd(), "folio.db"), { readonly: true });
	const rows = db.prepare("SELECT id, filename, mime FROM media WHERE mime LIKE 'image/%' AND url IS NULL").all();
	db.close();
	let ok = 0;
	let missing = 0;
	let failed = 0;
	fs.mkdirSync(THUMB_DIR, { recursive: true });
	for (const row of rows) {
		const thumbPath = path.join(THUMB_DIR, `${row.id}.jpg`);
		if (fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 0) {
			ok += 1;
			continue;
		}
		try {
			const buffer = fs.readFileSync(path.join(UPLOAD_DIR, row.filename));
			let input = buffer;
			let angle;
			if (/^image\/hei[cf]$/.test(row.mime)) {
				const heicConvert = require("heic-convert");
				input = Buffer.from(await heicConvert({ buffer, format: "JPEG", quality: 0.95 }));
				const orientation = await exifr.orientation(buffer).catch(() => 1);
				angle = { 3: 180, 6: 90, 8: 270 }[orientation] ?? 0;
			}
			await sharp(input).rotate(angle).resize(512, 512, { fit: "cover" }).jpeg({ quality: 82 }).toFile(thumbPath);
			missing += 1;
			console.log(`#${row.id} thumbnail generated (${row.mime})`);
		} catch (error) {
			failed += 1;
			console.log(`#${row.id} FAILED: ${error.message}`);
		}
	}
	console.log(`backfill done: ${ok} already present, ${missing} new, ${failed} failed`);
})();
