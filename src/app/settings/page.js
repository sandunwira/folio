import { redirect } from "next/navigation";
import { Suspense } from "react";
import { IconChevronLeft, IconPower, IconShieldLock } from "@tabler/icons-react";
import Link from "next/link";
import { getSessionUser, getSettings, sumMediaBytes, countMediaRows } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import { logoutAction, updateAdminSettingsAction } from "@/lib/actions";

export const metadata = { title: "Settings | Folio" };

async function Content({ searchParams }) {
	const user = await getSessionUser();
	if (!user) redirect("/login");
	const { error, saved } = await searchParams;
	const settings = getSettings();
	const mediaCount = countMediaRows(user.id);
	const mediaBytes = sumMediaBytes(user.id);
	const quotaGb = Number(settings.quota_gb) || 0;
	const quotaBytes = quotaGb * 1e9;
	const usagePercent = quotaBytes > 0 ? Math.min(100, (mediaBytes / quotaBytes) * 100) : 0;

	return (
		<div className="min-h-screen bg-surface text-ink">
			<header className="flex items-center gap-3 border-b border-line bg-panel px-5 py-3">
				<Link href="/" className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-black/5" aria-label="Back to archive">
					<IconChevronLeft size={18} />
				</Link>
				<h1 className="text-lg font-medium">Settings</h1>
			</header>

			<main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
				{error && <p className="rounded-lg bg-[#fbeaea] px-4 py-2.5 text-sm text-[#c5221f]">{error}</p>}
				{saved && <p className="rounded-lg bg-[#e9f2ea] px-4 py-2.5 text-sm text-[#1e6e35]">Settings saved.</p>}
				<section className="flex items-center gap-4 rounded-3xl border border-line bg-panel p-6">
					<span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink text-lg font-medium text-white">{(user.name?.[0] ?? "?").toUpperCase()}</span>
					<div className="min-w-0">
						<p className="flex items-center gap-2 truncate text-lg font-medium">
							{user.name}
							{user.isAdmin && (
								<span className="flex items-center gap-1 rounded-full bg-[#f1f1f1] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
									<IconShieldLock size={10} /> Admin
								</span>
							)}
						</p>
						<p className="truncate text-sm text-muted">@{user.username}</p>
					</div>
					<form action={logoutAction} className="ml-auto">
						<button className="flex h-9 items-center gap-2 rounded-full border border-line bg-panel px-4 text-sm font-medium text-ink transition hover:bg-black/5">
							<IconPower size={16} /> Log out
						</button>
					</form>
				</section>

				<section className="rounded-3xl border border-line bg-panel">
					<div className="border-b border-line px-6 py-4">
						<h2 className="text-base font-medium">Account</h2>
					</div>
					<dl className="divide-y divide-line text-sm">
						<div className="flex items-center justify-between px-6 py-3.5">
							<dt className="text-muted">Display name</dt>
							<dd className="font-medium">{user.name}</dd>
						</div>
						<div className="flex items-center justify-between px-6 py-3.5">
							<dt className="text-muted">Username</dt>
							<dd className="font-medium">@{user.username}</dd>
						</div>
						<div className="flex items-center justify-between px-6 py-3.5">
							<dt className="text-muted">Role</dt>
							<dd className="font-medium">{user.isAdmin ? "Admin" : "Member"}</dd>
						</div>
					</dl>
					<div className="border-t border-line px-6 py-4">
						<div className="flex items-end justify-between text-sm">
							<p className="text-muted">Storage usage</p>
							<p className="tabular-nums">{formatBytes(mediaBytes)} <span className="text-xs text-faint">of {quotaGb} GB</span></p>
						</div>
						<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ececec]">
							<div className="h-full rounded-full bg-ink" style={{ width: `${usagePercent}%` }} />
						</div>
						<p className="mt-2 text-xs text-faint">{mediaCount} item{mediaCount === 1 ? "" : "s"} in your archive · {usagePercent.toFixed(1)}% of the total quota used</p>
					</div>
				</section>

				{user.isAdmin && (
					<section className="rounded-3xl border border-line bg-panel">
						<div className="border-b border-line px-6 py-4">
							<h2 className="text-base font-medium">Site administration</h2>
							<p className="mt-1 text-xs text-muted">These settings control the whole archive for every account.</p>
						</div>
						<form action={updateAdminSettingsAction} className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
							<label className="flex flex-col gap-1.5">
								<span className="text-xs font-medium text-ink">Session lifetime (days)</span>
								<input name="sessionDays" type="number" min={1} max={365} required defaultValue={settings.session_days} className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-ink" />
							</label>
							<div className="flex flex-col gap-1.5">
								<span className="text-xs font-medium text-ink">Maintenance mode</span>
								<label className="flex min-h-10 items-center gap-2 text-sm text-ink">
									<input name="maintenance" type="checkbox" defaultChecked={settings.maintenance === "on"} className="h-4 w-4 accent-black" />
									Block non-admin access during maintenance
								</label>
							</div>
							<div className="sm:col-span-2">
								<button className="h-10 rounded-full bg-ink px-6 text-sm font-medium text-white transition hover:bg-black">Save settings</button>
							</div>
						</form>
					</section>
				)}
			</main>
		</div>
	);
}

export default async function SettingsPage(props) {
	return (
		<Suspense>
			<Content searchParams={props.searchParams} />
		</Suspense>
	);
}
