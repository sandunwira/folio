import { unlink } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { getSessionUser } from "@/lib/auth";
import { snapshotDb } from "@/lib/db";
import { BACKUP_DIR } from "@/lib/cron";

export async function GET() {
	const user = await getSessionUser();
	if (!user?.isAdmin) return new Response("Not found", { status: 404 });

	const dest = path.join(BACKUP_DIR, `folio-database-download-${Date.now()}.db`);
	try {
		await snapshotDb(dest);
	} catch (error) {
		return new Response(`Snapshot failed: ${error?.message ?? "unknown error"}`, { status: 500 });
	}

	const handled = (stream) => {
		stream.on("close", () => unlink(dest).catch(() => { }));
		return stream;
	};

	return new Response(Readable.toWeb(handled(createReadStream(dest))), {
		status: 200,
		headers: {
			"Content-Type": "application/octet-stream",
			"Content-Disposition": `attachment; filename="folio-${new Date().toISOString().slice(0, 10)}.db"`,
			"Cache-Control": "no-store",
		},
	});
}
