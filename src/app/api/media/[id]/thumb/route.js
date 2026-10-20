import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getSessionUser } from "@/lib/auth";
import { getMediaRow } from "@/lib/db";
import { THUMB_DIR, UPLOAD_DIR, ensureThumbnail } from "@/lib/uploads";

function streamOriginal(row, size) {
	const stream = createReadStream(path.join(UPLOAD_DIR, row.filename));
	return new Response(Readable.toWeb(stream), {
		status: 200,
		headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=3600", "Content-Length": String(size) },
	});
}

const NATIVE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml"]);

export async function GET(_request, { params }) {
	const { id } = await params;
	const numericId = Number(id);
	const row = Number.isInteger(numericId) ? getMediaRow(numericId) : null;
	if (!row) return new Response("Not found", { status: 404 });

	const user = await getSessionUser();
	if (!user || (row.user_id !== user.id && !user.isAdmin)) {
		return new Response("Not found", { status: 404 });
	}

	if (row.url) return Response.redirect(row.url, 302);

	const originalPath = path.join(UPLOAD_DIR, row.filename);
	const originalStat = await stat(originalPath).catch(() => null);
	if (!originalStat) return new Response("Not found", { status: 404 });

	if (!row.mime.startsWith("image/")) return streamOriginal(row, originalStat.size);

	const thumbPath = path.join(THUMB_DIR, `${row.id}.jpg`);
	let thumbStat = await stat(thumbPath).catch(() => null);
	if (!thumbStat || thumbStat.size === 0) {
		await ensureThumbnail(row);
		thumbStat = await stat(thumbPath).catch(() => null);
	}
	if (thumbStat && thumbStat.size > 0) {
		const stream = createReadStream(thumbPath);
		return new Response(Readable.toWeb(stream), {
			status: 200,
			headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=31536000, immutable", "Content-Length": String(thumbStat.size) },
		});
	}

	if (NATIVE_MIMES.has(row.mime)) return streamOriginal(row, originalStat.size);
	return new Response("Preview unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
}
