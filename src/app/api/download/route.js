import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { getSessionUser } from "@/lib/auth";
import { listMediaRows } from "@/lib/db";
import { UPLOAD_DIR } from "@/lib/uploads";
import { entryName } from "@/lib/archive";
import { ZipArchive } from "archiver";

const MAX_IDS = 500;

function sanitizeFilename(value, ext) {
	const base = String(value || "media").replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").trim() || "media";
	return `${base.slice(0, 120)}${ext}`;
}

function attachmentName(name) {
	const ascii = name.replace(/\t\s+/g, "_").replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "-");
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

function pushError(stream, handler) {
	if (!stream.listenerCount("error")) stream.on("error", handler);
}

async function downloadOriginal(row) {
	const stream = createReadStream(path.join(UPLOAD_DIR, row.filename));
	pushError(stream, () => { });
	return new Response(Readable.toWeb(stream), {
		status: 200,
		headers: {
			"Content-Type": row.mime,
			"Content-Disposition": attachmentName(sanitizeFilename(row.title, path.extname(row.filename) || "")),
			"Cache-Control": "no-store",
		},
	});
}

export async function GET(request) {
	const user = await getSessionUser();
	if (!user) return new Response("Not found", { status: 404 });

	const idParam = new URL(request.url).searchParams.get("ids") ?? "";
	const wanted = new Set(
		idParam
			.split(",")
			.map(Number)
			.filter((id) => Number.isInteger(id) && id > 0)
			.slice(0, MAX_IDS)
			.map(String)
	);
	if (wanted.size === 0) return new Response("No ids given", { status: 400 });

	const rows = listMediaRows(user.id).filter((row) => wanted.has(String(row.id)));
	if (rows.length === 0) return new Response("Not found", { status: 404 });

	if (rows.length === 1) {
		const row = rows[0];
		if (row.url) return Response.redirect(row.url, 302);
		if (!row.filename) return new Response("Not found", { status: 404 });
		return downloadOriginal(row);
	}

	const zip = new ZipArchive({ zlib: { level: 9 } });
	zip.on("error", () => { });
	const used = new Set();
	for (const row of rows.filter((row) => !row.url)) {
		zip.append(createReadStream(path.join(UPLOAD_DIR, row.filename)), { name: entryName(row, used) });
	}
	if (used.size === 0) return new Response("Nothing downloadable in selection", { status: 404 });
	zip.finalize();

	return new Response(Readable.toWeb(zip, { cleanup: true }), {
		status: 200,
		headers: {
			"Content-Type": "application/zip",
			"Content-Disposition": attachmentName(sanitizeFilename(`folio-${rows.length}-items`, ".zip")),
			"Cache-Control": "no-store",
		},
	});
}
