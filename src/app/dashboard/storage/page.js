import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionUser, getSettings, listUsers, sumMediaBytes, countMediaRows, setSettings, logEvent } from "@/lib/auth";
import { computeStorageReport } from "@/lib/storage";

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

function sizeLabel(bytes) {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = Number(bytes) || 0;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function nowMs() {
	return Date.now();
}

async function updateQuotaAction(formData) {
	"use server";
	const user = await getSessionUser();
	if (!user?.isAdmin) redirect("/");
	const quotaGb = Number(formData.get("quotaGb"));
	if (!Number.isFinite(quotaGb) || quotaGb < 1) redirect(`/dashboard/storage?error=${encodeURIComponent("Storage quota must be at least 1 GB.")}`);
	setSettings({ quota_gb: String(quotaGb) });
	logEvent("settings_updated", user.username, `Storage quota set to ${quotaGb} GB`);
	redirect(`/dashboard/storage?saved=1&t=${nowMs()}`);
}

async function Content({ searchParams }) {
	const params = await searchParams;
	const user = await getSessionUser();
	if (!user?.isAdmin) redirect("/");
	const settings = getSettings();
	const quotaGb = Number(settings.quota_gb) || 15;
	const report = await computeStorageReport();
	const accounts = listUsers()
		.map((account) => ({
			...account,
			mediaCount: countMediaRows(account.id),
			mediaBytes: sumMediaBytes(account.id),
		}))
		.sort((a, b) => b.mediaBytes - a.mediaBytes);
	const storedBytes = accounts.reduce((total, account) => total + account.mediaBytes, 0);
	const usedGb = Number((report.uploads / 1e9).toFixed(2));
	const percent = quotaGb > 0 ? Math.min(100, (report.uploads / (quotaGb * 1e9)) * 100) : 0;
	const saved = params.saved === "1";
	const error = typeof params.error === "string" ? params.error : null;
	const diskRows = [
		["Original uploads", report.uploads, "Original photos and videos in data/uploads"],
		["Thumbnails", report.thumbs, "512×512 preview JPEGs in data/thumbs"],
		["Database", report.database, "folio.db plus its WAL journal"],
		["Snapshots", report.backups, "Scheduled and manual DB snapshots in data/backups"],
		["Config exports", report.exports, "Configuration export files in data/exports"],
	];
	const diskTotal = diskRows.reduce((total, [, bytes]) => total + bytes, 0);
	const largestAccount = Math.max(1, ...accounts.map((account) => account.mediaBytes));

	return (
		<div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
			<div>
				<h1 className="text-[22px] font-medium">Storage</h1>
				<p className="mt-1 text-sm text-muted">Disk usage of the server and per-account consumption. Actual usage is auto-computed from data/uploads.</p>
			</div>

			{saved && <p className="rounded-xl bg-[#e6f4ea] px-4 py-2.5 text-xs font-medium text-[#1e7e34]">Storage quota updated.</p>}
			{error && <p className="rounded-xl bg-[#fbeaea] px-4 py-2.5 text-xs font-medium text-[#c5221f]">{error}</p>}

			<Card title="Usage overview">
				<div className="flex items-end justify-between">
					<p className="text-3xl font-medium tabular-nums">{usedGb} GB</p>
					<p className="text-xs text-muted">of {quotaGb} GB quota · {percent.toFixed(1)}% used</p>
				</div>
				<div className="mt-4 h-2 overflow-hidden rounded-full bg-[#ececec]">
					<div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
				</div>
			</Card>

			<Card title="Settings" text="The quota caps what accounts may upload.">
				<form action={updateQuotaAction} className="flex flex-wrap items-end gap-3">
					<label className="block">
						<span className="mb-1 block text-xs font-medium text-muted">Storage quota (GB)</span>
						<input name="quotaGb" type="number" min={1} step="any" required defaultValue={quotaGb} className="h-10 w-40 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-ink" />
					</label>
					<button type="submit" className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black">Save</button>
				</form>
			</Card>

			<Card title="Server disk usage" text={`Everything folio keeps on disk totals about ${sizeLabel(diskTotal)}.`}>
				<dl className="divide-y divide-line text-sm">
					{diskRows.map(([label, bytes, hint]) => (
						<div key={label} className="flex items-center justify-between gap-4 px-1 py-3">
							<div className="min-w-0">
								<dt className="font-medium">{label}</dt>
								<dd className="truncate text-xs text-muted">{hint}</dd>
							</div>
							<dd className="shrink-0 tabular-nums text-muted">{sizeLabel(bytes)}</dd>
						</div>
					))}
				</dl>
			</Card>

			<Card title="Per-account usage" text={`Library files across all accounts: ${sizeLabel(storedBytes)}.`}>
				<ul className="divide-y divide-line">
					{accounts.map((account) => (
						<li key={account.id} className="px-1 py-3">
							<div className="flex items-center gap-3">
								<span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-medium text-white">{(account.display_name?.[0] ?? "?").toUpperCase()}</span>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">
										{account.display_name}
										<span className="ml-2 text-xs font-normal text-muted">@{account.username}{account.is_admin === 1 ? " · Admin" : ""}</span>
									</p>
									<p className="text-xs text-muted">{account.mediaCount} item{account.mediaCount === 1 ? "" : "s"} · {sizeLabel(account.mediaBytes)}</p>
								</div>
								<span className="shrink-0 text-xs tabular-nums text-faint">{quotaGb > 0 ? `${((account.mediaBytes / (quotaGb * 1e9)) * 100).toFixed(1)}%` : "-"}</span>
							</div>
							<div className="mt-2 ml-12 h-1 overflow-hidden rounded-full bg-[#ececec]">
								<div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, (account.mediaBytes / largestAccount) * 100)}%` }} />
							</div>
						</li>
					))}
					{accounts.length === 0 && <li className="px-1 py-6 text-center text-sm text-muted">No accounts yet.</li>}
				</ul>
			</Card>
		</div>
	);
}

export default async function StoragePage(props) {
	return (
		<Suspense>
			<Content searchParams={props.searchParams} />
		</Suspense>
	);
}
