import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import exifr from "exifr";
import { deleteMediaRow, getSettings, insertMediaRow, listExpiredTrashRows, listMediaRows, setSettings } from "./db";
import { estimateLocation } from "./geocode";
import { SAMPLE_MEDIA } from "./media-data";
import { formatBytes } from "./format";

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

const VIEW_FILTERS = {
	media: (row) => !row.trashed && !row.vaulted && !row.archived,
	people: (row) => !row.trashed && !row.vaulted && !row.archived,
	favorites: (row) => row.favorite && !row.trashed && !row.vaulted && !row.archived,
	archive: (row) => row.archived && !row.trashed && !row.vaulted,
	vault: (row) => row.vaulted && !row.trashed,
	trash: (row) => row.trashed,
};

const EXIF_MIMES = new Set(["image/jpeg", "image/png", "image/heic", "image/heif", "image/tiff", "image/webp", "image/avif"]);

async function extractUploadMeta(buffer, mime) {
	if (!EXIF_MIMES.has(mime)) return {};
	try {
		const exif = await exifr.parse(buffer, { tiff: true, exif: true, reviveValues: true });
		let latitude = null;
		let longitude = null;
		try {
			const gps = await exifr.gps(buffer);
			if (Number.isFinite(gps?.latitude) && Number.isFinite(gps?.longitude)) {
				latitude = gps.latitude;
				longitude = gps.longitude;
			}
		} catch {
			latitude = null;
		}
		const takenDate = ["DateTimeOriginal", "CreateDate", "ModifyDate"].map((key) => {
			const value = exif?.[key];
			if (value instanceof Date) return value.getTime();
			const parsed = Date.parse(value);
			return Number.isFinite(parsed) ? parsed : NaN;
		}).find((value) => Number.isFinite(value));
		const meta = {};
		if (Number.isFinite(takenDate)) meta.createdAt = takenDate;
		if (latitude != null) {
			meta.location = `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? "N" : "S"}, ${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? "E" : "W"}`;
			meta.est = await estimateLocation(latitude, longitude);
		}
		return meta;
	} catch {
		return {};
	}
}

function formatDateGroups(ms) {
	const then = new Date(ms);
	const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
	const diffDays = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86400000);
	if (diffDays === 0 || diffDays === 1) {
		return {
			date: diffDays === 0 ? "Today" : "Yesterday",
			time: then.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
		};
	}
	return {
		date: then.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
		time: then.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
	};
}

async function purgeExpiredTrash(userId) {
	const days = Number(getSettings().trash_days) || 60;
	const expired = listExpiredTrashRows(userId, days);
	for (const row of expired) {
		if (!row.url && row.filename) {
			await unlink(path.join(UPLOAD_DIR, row.filename)).catch(() => { });
		}
		deleteMediaRow(row.id);
	}
}

async function ensureSampleMedia(userId) {
	const settings = getSettings();
	if (settings[`samples_seeded_${userId}`] === "1") return;
	const now = Date.now();
	for (const sample of SAMPLE_MEDIA) {
		insertMediaRow({
			userId,
			title: sample.title,
			filename: "",
			mime: sample.type === "video" ? "video/mp4" : "image/jpeg",
			size: 0,
			location: sample.location,
			url: sample.image,
			favorite: sample.favorite ?? 0,
			archived: sample.archived ?? 0,
			createdAt: now - sample.minutesAgo * 60000,
		});
	}
	setSettings({ [`samples_seeded_${userId}`]: "1" });
}

export async function listUserMedia(userId, view = "media") {
	await ensureSampleMedia(userId);
	await purgeExpiredTrash(userId);
	const filter = VIEW_FILTERS[view] ?? VIEW_FILTERS.media;
	return listMediaRows(userId)
		.filter(filter)
		.map((row) => {
			const { date, time } = formatDateGroups(row.created_at);
			return {
				id: row.id,
				title: row.title,
				date,
				time,
				location: row.location ?? "",
				estLocation: row.est_location ?? "",
				estCity: row.est_city ?? "",
				estCountry: row.est_country ?? "",
				type: row.mime.startsWith("video/") ? "video" : "photo",
				image: row.url || `/api/media/${row.id}`,
				large: row.url ? row.url.replace("w=800", "w=1600") : `/api/media/${row.id}`,
				mime: row.mime,
				size: formatBytes(row.size),
				favorite: !!row.favorite,
				trashed: !!row.trashed,
			};
		});
}

export async function saveUpload(file) {
	const buffer = Buffer.from(await file.arrayBuffer());
	const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
	const storedName = `${randomUUID()}${ext}`;
	await mkdir(UPLOAD_DIR, { recursive: true });
	await writeFile(path.join(UPLOAD_DIR, storedName), buffer);
	const meta = await extractUploadMeta(buffer, file.type);
	return { storedName, size: file.size, ...meta };
}
