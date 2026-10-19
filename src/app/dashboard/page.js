import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getSessionUser, countUsers, countAdmins, countActiveSessions, recentUsers, getSettings } from "@/lib/auth";
import { computeUsedGb } from "@/lib/storage";

function StatCard({ label, value, sub, children }) {
	return (
		<section className="rounded-3xl border border-line bg-panel p-6">
			<p className="text-xs font-medium text-muted">{label}</p>
			<p className="mt-2 text-3xl font-medium tabular-nums">{value}</p>
			{sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
			{children}
		</section>
	);
}

async function Content() {
	const user = await getSessionUser();
	if (!user?.isAdmin) redirect("/");
	const settings = getSettings();
	const users = countUsers();
	const admins = countAdmins();
	const members = users - admins;
	const activeSessions = countActiveSessions();
	const recent = recentUsers(5).map((account) => ({
		...account,
		date: new Date(account.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
	}));
	const computedUsedGb = await computeUsedGb();
	const usedGb = computedUsedGb ?? Number(settings.used_gb);
	const quotaGb = Number(settings.quota_gb);
	const storagePercent = quotaGb > 0 ? Math.min(100, (usedGb / quotaGb) * 100) : 0;
	const maintenance = settings.maintenance === "on";

	return (
		<div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
			<div>
				<h1 className="text-[22px] font-medium">Overview</h1>
				<p className="mt-1 text-sm text-muted">Health of your self-hosted archive.</p>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<StatCard label="Accounts" value={users} sub={`${admins} admin${admins === 1 ? "" : "s"} · ${members} member${members === 1 ? "" : "s"}`}>
					<div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-[#ececec]">
						{users > 0 && <div className="h-full bg-ink" style={{ width: `${(admins / users) * 100}%` }} />}
					</div>
				</StatCard>
				<StatCard label="Storage" value={`${usedGb} GB`} sub={`${usedGb} GB of ${quotaGb} GB used`}>
					<div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#ececec]"><div className="h-full rounded-full bg-ink" style={{ width: `${storagePercent}%` }} /></div>
				</StatCard>
				<StatCard label="Active sessions" value={activeSessions} sub="devices currently signed in" />
			</div>

			{maintenance && (
				<section className="rounded-3xl border border-line bg-panel p-6">
					<p className="flex items-center gap-2 text-sm font-medium">
						<span className="h-2 w-2 rounded-full bg-warning" />
						Maintenance mode is on
					</p>
					<p className="mt-1 text-xs text-muted">Non-admin visitors see a maintenance notice instead of the archive. You can turn it off under Site settings.</p>
				</section>
			)}

			<section className="rounded-3xl border border-line bg-panel">
				<div className="border-b border-line px-6 py-4">
					<h2 className="text-base font-medium">Latest accounts</h2>
				</div>
				<ul className="divide-y divide-line">
					{recent.map((account) => (
						<li key={account.id} className="flex items-center gap-3 px-6 py-3.5">
							<span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-medium text-white">{(account.display_name?.[0] ?? "?").toUpperCase()}</span>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">
									{account.display_name}
									<span className="ml-2 text-xs font-normal text-muted">@{account.username}</span>
								</p>
							</div>
							<span className="text-xs tabular-nums text-faint">{account.date}</span>
						</li>
					))}
					{recent.length === 0 && <li className="px-6 py-6 text-center text-sm text-muted">No accounts yet.</li>}
				</ul>
				<div className="border-t border-line px-6 py-3">
					<Link href="/dashboard/users" className="text-sm font-medium text-ink hover:underline">Manage accounts &rarr;</Link>
				</div>
			</section>
		</div>
	);
}

export default async function AdminOverviewPage() {
	return (
		<Suspense>
			<Content />
		</Suspense>
	);
}
