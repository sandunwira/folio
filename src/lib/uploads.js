import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { getSettings, insertMediaRow, listMediaRows, setSettings } from "./db";
import { SAMPLE_MEDIA } from "./media-data";

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

const VIEW_FILTERS = {
	media: (row) => !row.trashed && !row.vaulted && !row.archived,
	people: (row) => !row.trashed && !row.vaulted && !row.archived,
	favorites: (row) => row.favorite && !row.trashed && !row.vaulted && !row.archived,
	archive: (row) => row.archived && !row.trashed && !row.vaulted,
	vault: (row) => row.vaulted && !row.trashed,
	trash: (row) => row.trashed,
};

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

function formatBytes(bytes) {
	if (!bytes || bytes <= 0) return null;
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
	return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
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
				type: row.mime.startsWith("video/") ? "video" : "photo",
				image: row.url || `/api/media/${row.id}`,
				mime: row.mime,
				size: formatBytes(row.size),
				favorite: !!row.favorite,
				trashed: !!row.trashed,
			};
		});
}

export async function saveUpload(file) {
	const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
	const storedName = `${randomUUID()}${ext}`;
	await mkdir(UPLOAD_DIR, { recursive: true });
	await writeFile(path.join(UPLOAD_DIR, storedName), Buffer.from(await file.arrayBuffer()));
	return { storedName, size: file.size };
}
