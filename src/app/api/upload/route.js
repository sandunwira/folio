import path from "node:path";
import { getSettings, getSessionUser, insertMediaRow, logEvent, sumMediaBytes } from "@/lib/auth";
import { saveUpload, writeThumbnail } from "@/lib/uploads";

const EXT_MIME = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
	".gif": "image/gif",
	".tif": "image/tiff",
	".tiff": "image/tiff",
	".avif": "image/avif",
	".heic": "image/heic",
	".heif": "image/heif",
	".mp4": "video/mp4",
	".m4v": "video/mp4",
	".mov": "video/quicktime",
	".webm": "video/webm",
};

export async function POST(request) {
	const user = await getSessionUser();
	if (!user) return Response.json({ error: "Sign in to upload." }, { status: 401 });

	const form = await request.formData();
	const files = form.getAll("files").filter((entry) => entry && typeof entry === "object" && "arrayBuffer" in entry);
	if (files.length === 0) return Response.json({ error: "No files were selected." }, { status: 400 });

	const quotaBytes = Number(getSettings().quota_gb) * 1024 ** 3;
	let uploaded = 0;
	let badType = 0;
	let overQuota = 0;
	for (const file of files) {
		const mime = /^(image|video)\//.test(file.type) ? file.type : EXT_MIME[path.extname(file.name).toLowerCase()] ?? "";
		if (!mime || file.size === 0) {
			badType += 1;
			continue;
		}
		if (sumMediaBytes(user.id) + file.size > quotaBytes) {
			overQuota += 1;
			continue;
		}
		const saved = await saveUpload(file, mime);
		const title = path.parse(file.name).name.slice(0, 120) || "Untitled";
		const lastModified = Number(form.get("lastModified"));
		const inserted = insertMediaRow({
			userId: user.id,
			title,
			filename: saved.storedName,
			mime,
			size: saved.size,
			location: saved.location ?? "",
			est: saved.est ?? null,
			createdAt: saved.createdAt ?? (Number.isFinite(lastModified) ? lastModified : Date.now()),
		});
		if (mime.startsWith("image/")) await writeThumbnail(inserted.id, saved.buffer, mime);
		uploaded += 1;
	}

	if (uploaded > 0) logEvent("media_uploaded", user.username, `${uploaded} item${uploaded === 1 ? "" : "s"} uploaded`);
	if (badType > 0) logEvent("media_upload_skipped", user.username, `${badType} item${badType === 1 ? "" : "s"} skipped (unsupported file type)`);
	if (overQuota > 0) logEvent("media_upload_skipped", user.username, `${overQuota} item${overQuota === 1 ? "" : "s"} skipped (storage quota reached)`);

	return Response.json({ uploaded, badType, overQuota });
}
