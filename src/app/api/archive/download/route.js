import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { getSessionUser } from "@/lib/auth";
import { archiveZipPath } from "@/lib/archive";

export async function GET() {
	const user = await getSessionUser();
	if (!user) return new Response("Not found", { status: 404 });

	const zipPath = await archiveZipPath(user.id);
	const fileStat = await stat(zipPath).catch(() => null);
	if (!fileStat) return new Response("Archive is empty", { status: 404 });

	const stream = createReadStream(zipPath);
	return new Response(Readable.toWeb(stream), {
		status: 200,
		headers: {
			"Content-Type": "application/zip",
			"Content-Length": String(fileStat.size),
			"Content-Disposition": `attachment; filename="folio-archive-${user.username}.zip"`,
			"Cache-Control": "no-store",
		},
	});
}
