import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import exifr from "exifr";
import { getSessionUser } from "@/lib/auth";
import { getMediaRow, setMediaEstLocation, setMediaLocation } from "@/lib/db";
import { UPLOAD_DIR } from "@/lib/uploads";
import { estimateLocation } from "@/lib/geocode";

const exifCache = new Map();

async function parseExif(row) {
	const filePath = path.join(UPLOAD_DIR, row.filename);
	const fileStat = await stat(filePath).catch(() => null);
	if (!fileStat) return {};
	const cacheKey = `${row.filename}:${fileStat.size}:${fileStat.mtimeMs}`;
	const cached = exifCache.get(cacheKey);
	if (cached) return cached;
	const buffer = await readFile(filePath);
	let parsed = await exifr.parse(buffer, { tiff: true, ifd0: true, exif: true, gps: true, reviveValues: true }).catch(() => null);
	parsed = parsed ?? {};
	const gps = await exifr.gps(buffer).catch(() => null);
	if (Number.isFinite(gps?.latitude) && Number.isFinite(gps?.longitude)) {
		parsed = { ...gps, ...parsed, Latitude: gps.latitude, Longitude: gps.longitude };
	}
	exifCache.set(cacheKey, parsed);
	if (exifCache.size > 200) exifCache.delete(exifCache.keys().next().value);
	return parsed;
}

export async function GET(request, { params }) {
	const { id } = await params;
	const numericId = Number(id);
	const row = Number.isInteger(numericId) ? getMediaRow(numericId) : null;
	if (!row) return Response.json({ error: "Not found" }, { status: 404 });

	const user = await getSessionUser();
	if (!user || (row.user_id !== user.id && !user.isAdmin)) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	if (!row.filename) return Response.json({ exif: {}, place: null });
	const exif = await parseExif(row);
	let est = null;
	if (row.est_location) {
		est = { location: row.est_location, city: row.est_city, district: row.est_district, state: row.est_state, country: row.est_country };
	}
	if (!row.location && Number.isFinite(exif.Latitude) && Number.isFinite(exif.Longitude)) {
		setMediaLocation(row.id, `${Math.abs(exif.Latitude).toFixed(4)}° ${exif.Latitude >= 0 ? "N" : "S"}, ${Math.abs(exif.Longitude).toFixed(4)}° ${exif.Longitude >= 0 ? "E" : "W"}`);
	}
	if ((!row.est_city || !row.est_country) && Number.isFinite(exif.Latitude) && Number.isFinite(exif.Longitude)) {
		est = await estimateLocation(exif.Latitude, exif.Longitude);
		if (est) setMediaEstLocation(row.id, est);
	}
	return Response.json({ exif, place: est?.location ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}
