import fs from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { getSessionUser, listMediaRows, listAlbums, listAlbumMediaRows } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/uploads";
import { ZipArchive } from "archiver";

function stamp() {
	const now = new Date();
	const pad = (value) => String(value).padStart(2, "0");
	return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export async function GET() {
	const user = await getSessionUser();
	if (!user) return new Response("Not found", { status: 404 });

	const rows = listMediaRows(user.id);
	const albums = listAlbums(user.id).map((album) => ({
		name: album.name,
		created_at: album.created_at,
		items: listAlbumMediaRows(album.id, user.id)
			.map((row) => row.filename || row.url)
			.filter(Boolean),
	}));

	const payload = {
		folio_export_version: 1,
		exported_at: Date.now(),
		account: user.username,
		media: rows.map((row) => ({
			title: row.title,
			filename: row.filename,
			mime: row.mime,
			size: row.size,
			location: row.location,
			est_location: row.est_location,
			est_city: row.est_city,
			est_district: row.est_district,
			est_state: row.est_state,
			est_country: row.est_country,
			url: row.url,
			favorite: row.favorite,
			archived: row.archived,
			vaulted: row.vaulted,
			trashed: row.trashed,
			created_at: row.created_at,
		})),
		albums,
	};

	const included = rows.filter((row) => row.filename && !row.url && fs.existsSync(path.join(UPLOAD_DIR, row.filename)));

	const zip = new ZipArchive({ zlib: { level: 9 } });
	zip.append(Buffer.from(JSON.stringify(payload, null, 2)), { name: "folio-data.json" });
	for (const row of included) {
		zip.append(fs.createReadStream(path.join(UPLOAD_DIR, row.filename)), { name: `uploads/${path.basename(row.filename)}` });
	}
	zip.finalize();

	return new Response(Readable.toWeb(zip), {
		status: 200,
		headers: {
			"Content-Type": "application/zip",
			"Content-Disposition": `attachment; filename="folio-my-data-${stamp()}.zip"`,
			"Cache-Control": "no-store",
		},
	});
}
