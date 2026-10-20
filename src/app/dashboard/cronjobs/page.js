import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionUser, listCronJobRows } from "@/lib/auth";
import { runCronAction, toggleCronAction } from "@/lib/actions";

function Card({ title, text, children }) {
	return (
		<section className="rounded-3xl border border-line bg-panel p-6">
			<div className="border-b border-line pb-4">
				<h2 className="text-base font-medium">{title}</h2>
				{text && <p className="mt-1 text-xs text-muted">{text}</p>}
			</div>
			<div className="pt-4">{children}</div>
		</section>
	);
}

async function Content() {
	const user = await getSessionUser();
	if (!user?.isAdmin) redirect("/");
	const jobs = listCronJobRows();

	return (
		<div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
			<div>
				<h1 className="text-[22px] font-medium">Cron Jobs</h1>
				<p className="mt-1 text-sm text-muted">Two pre-configured maintenance jobs ship with the server, each running every 2 hours. The server checks every minute. You can run a job manually at any time, or pause it. Backups and config import/export live under Import / export.</p>
			</div>

			<Card title="Scheduled jobs">
				<div className="space-y-3">
					{jobs.map((job) => {
						const nextDue = job.active ? job.last_run + job.interval_minutes * 60_000 : null;
						const due = nextDue !== null && nextDue <= nowMs();
						return (
							<div key={job.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4">
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">{job.name}</p>
									<p className="mt-0.5 text-xs text-muted">
										{job.job_type === "snapshot" ? "Database snapshot" : "Configuration export"} · every {job.interval_minutes} min · last run {job.last_run ? new Date(job.last_run).toLocaleString() : "never"} ·{" "}
										{job.active ? (due ? <span className="font-medium text-warning">due now</span> : `next check ${new Date(nextDue).toLocaleString()}`) : "paused"}
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<form action={runCronAction.bind(null, job.id)}>
										<button className="h-10 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition hover:bg-black/5">Run now</button>
									</form>
									<form action={toggleCronAction.bind(null, job.id)}>
										<button className="h-10 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition hover:bg-black/5">{job.active ? "Pause" : "Resume"}</button>
									</form>
								</div>
							</div>
						);
					})}
					{jobs.length === 0 && <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted">Pre-configured jobs will appear here automatically.</p>}
				</div>
			</Card>
		</div>
	);
}

function nowMs() {
	return Date.now();
}

export default async function CronJobsPage() {
	return (
		<Suspense>
			<Content />
		</Suspense>
	);
}
