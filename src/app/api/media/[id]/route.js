import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getSessionUser } from "@/lib/auth";
import { getMediaRow } from "@/lib/db";
import { UPLOAD_DIR } from "@/lib/uploads";

export async function GET(request, { params }) {
	const { id } = await params;
	const numericId = Number(id);
	const row = Number.isInteger(numericId) ? getMediaRow(numericId) : null;
	if (!row) return new Response("Not found", { status: 404 });

	const user = await getSessionUser();
	if (!user || (row.user_id !== user.id && !user.isAdmin)) {
		return new Response("Not found", { status: 404 });
	}

	const filePath = path.join(UPLOAD_DIR, row.filename);
	const fileStat = await stat(filePath).catch(() => null);
	if (!fileStat) return new Response("Not found", { status: 404 });

	const baseHeaders = {
		"Content-Type": row.mime,
		"Cache-Control": "private, max-age=3600",
		"Accept-Ranges": "bytes",
	};

	const range = request.headers.get("range");
	if (range) {
		const match = /bytes=(\d*)-(\d*)/.exec(range);
		const start = match?.[1] ? Number(match[1]) : 0;
		const end = Math.min(match?.[2] ? Number(match[2]) : fileStat.size - 1, fileStat.size - 1);
		if (start >= fileStat.size || start > end) {
			return new Response("Range not satisfiable", { status: 416, headers: { "Content-Range": `bytes */${fileStat.size}` } });
		}
		const stream = createReadStream(filePath, { start, end });
		return new Response(Readable.toWeb(stream), {
			status: 206,
			headers: { ...baseHeaders, "Content-Range": `bytes ${start}-${end}/${fileStat.size}`, "Content-Length": String(end - start + 1) },
		});
	}

	const stream = createReadStream(filePath);
	return new Response(Readable.toWeb(stream), {
		status: 200,
		headers: { ...baseHeaders, "Content-Length": String(fileStat.size) },
	});
}
