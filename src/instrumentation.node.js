let started = false;

export async function register() {
	if (started) return;
	started = true;

	if (process.env.FOLIO_CRON_DISABLED === "1") {
		console.log("[folio-cron] disabled via FOLIO_CRON_DISABLED");
		return;
	}

	const { runDueCronJobs } = await import("./lib/cron");
	const TICK_MS = 60_000;

	const scheduleNext = () => {
		const timer = setTimeout(async () => {
			try {
				await runDueCronJobs();
			} catch (error) {
				console.error("[folio-cron] tick failed:", error?.message ?? error);
			}
			scheduleNext();
		}, TICK_MS);
		timer.unref?.();
	};

	scheduleNext();
	console.log("[folio-cron] scheduler started, checking every 60s");
}
