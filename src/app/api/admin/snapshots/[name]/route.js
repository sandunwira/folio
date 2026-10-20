import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getSessionUser } from "@/lib/auth";
import { filePathFor } from "@/lib/cron";

export async function GET(request, { params }) {
	const user = await getSessionUser();
	if (!user?.isAdmin) return new Response("Not found", { status: 404 });

	const { name } = await params;
	const filePath = filePathFor("snapshot", name);
	const fileStat = filePath ? await stat(filePath).catch(() => null) : null;
	if (!filePath || !fileStat) return new Response("Not found", { status: 404 });

	const stream = createReadStream(filePath);
	return new Response(Readable.toWeb(stream), {
		status: 200,
		headers: {
			"Content-Type": "application/octet-stream",
			"Content-Disposition": `attachment; filename="${name}"`,
			"Cache-Control": "no-store",
		},
	});
}
