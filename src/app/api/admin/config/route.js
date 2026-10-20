import { getSessionUser } from "@/lib/auth";
import { filterConfig } from "@/lib/cron";
import { getSettings } from "@/lib/auth";

export async function GET() {
	const user = await getSessionUser();
	if (!user?.isAdmin) return new Response("Not found", { status: 404 });

	const payload = {
		folio_config_version: 1,
		exported_at: Date.now(),
		settings: filterConfig(getSettings()),
	};
	const body = JSON.stringify(payload, null, 2);
	return new Response(body, {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Content-Disposition": `attachment; filename="folio-config.json"`,
			"Cache-Control": "no-store",
		},
	});
}
