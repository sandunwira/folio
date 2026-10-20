import fs from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { IconDatabase, IconDeviceFloppy, IconDownload, IconTrash, IconUpload } from "@tabler/icons-react";
import Icon from "@/components/icon";
import { getSessionUser, logEvent, validateDatabaseFile, swapDatabaseFile } from "@/lib/auth";
import { createSnapshotAction, deleteFileAction, exportConfigAction, importConfigAction } from "@/lib/actions";
import { listConfigExports, listSnapshots } from "@/lib/cron";

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

function Button({ type = "button", children, ...rest }) {
	return (
		<button type={type} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black" {...rest}>
			{children}
		</button>
	);
}

function prettyStamp(name) {
	const match = name.match(/folio-(?:snapshot|config)-(\d{8})-(\d{6})/);
	if (!match) return name;
	const raw = `${match[1]}-${match[2]}`;
	const parsed = new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}`);
	return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : name;
}

function sizeLabel(bytes) {
	const units = ["B", "KB", "MB", "GB"];
	let value = Number(bytes) || 0;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

async function importDatabaseAction(formData) {
	"use server";
	const session = await getSessionUser();
	if (!session?.isAdmin) redirect("/");
	const file = formData.get("database");
	const fail = (message) => redirect(`/dashboard/import-export?error=${encodeURIComponent(message)}`);
	if (!(file instanceof File) || file.size === 0) fail("Choose a database file to upload.");
	const tempPath = path.join(process.cwd(), "data", "backups", "folio-upload.tmp.db");
	try {
		await fs.writeFile(tempPath, Buffer.from(await file.arrayBuffer()));
		await validateDatabaseFile(tempPath);
		await swapDatabaseFile(tempPath);
		logEvent("db_restored", session.username, `Restored database from uploaded file "${file.name}" (${sizeLabel(file.size)})`);
		redirect("/dashboard/import-export?dbrestored=1");
	} catch (error) {
		if (typeof error?.digest === "string" && error.digest.startsWith("NEXT_")) throw error;
		await fs.rm(tempPath, { force: true });
		fail(error.message || "The database could not be restored.");
	}
}

async function Content() {
	const user = await getSessionUser();
	if (!user?.isAdmin) redirect("/");
	const snapshots = listSnapshots();
	const configExports = listConfigExports();

	return (
		<div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
			<div>
				<h1 className="text-[22px] font-medium">Import/Export</h1>
				<p className="mt-1 text-sm text-muted">Download the database, snapshot it on demand, and move server configuration in and out. For scheduled automation see Cron jobs.</p>
			</div>

			<Card title="Download" text="Dump the entire live SQLite database, or export the current server configuration as JSON.">
				<div className="flex flex-wrap items-center gap-3">
					<a href="/api/admin/db" download className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black">
						<Icon icon={IconDatabase} size={16} /> Download database
					</a>
					<a href="/api/admin/config" download className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink transition hover:bg-black/5">
						<Icon icon={IconDownload} size={16} /> Export configuration
					</a>
				</div>
			</Card>

			<Card title="Restore database" text="Upload a previously downloaded folio.db (or backup dump). It is validated, replaces the live database immediately, and a pre-restore snapshot is saved automatically. Original photo/video files on disk are kept. You may need to sign in again after restoring.">
				<form action={importDatabaseAction}>
					<input type="file" name="database" accept=".db,.sqlite,.sqlite3,application/octet-stream" required className="block w-full max-w-sm cursor-pointer rounded-xl border border-line bg-surface px-3 py-2 text-xs text-muted file:mr-3 file:cursor-pointer file:border-0 file:rounded-full file:bg-ink file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-white" />
					<div className="mt-3">
						<Button type="submit">
							<Icon icon={IconUpload} size={16} /> Restore database
						</Button>
					</div>
				</form>
			</Card>

			<Card title="Import server configuration" text="Upload a Folio configuration JSON file exported previously. Recognised settings are applied immediately.">
				<form action={importConfigAction}>
					<input type="file" name="config" accept="application/json,.json" required className="block w-full max-w-sm cursor-pointer rounded-xl border border-line bg-surface px-3 py-2 text-xs text-muted file:mr-3 file:cursor-pointer file:border-0 file:rounded-full file:bg-ink file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-white" />
					<div className="mt-3">
						<Button type="submit">
							<Icon icon={IconDeviceFloppy} size={16} /> Import configuration
						</Button>
					</div>
				</form>
			</Card>

			<Card title="Snapshot history" text="Snapshots are full copies of folio.db saved under data/backups.">
				<form action={createSnapshotAction} className="mb-3">
					<Button type="submit">
						<Icon icon={IconDatabase} size={16} /> Create snapshot now
					</Button>
				</form>
				<div className="space-y-2">
					{snapshots.map((file) => (
						<div key={file.name} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3">
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{prettyStamp(file.name)}</p>
								<p className="truncate text-xs text-faint">{file.name} · {sizeLabel(file.size)}</p>
							</div>
							<a href={`/api/admin/snapshots/${encodeURIComponent(file.name)}`} download className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-black/5" aria-label={`Download ${file.name}`}>
								<Icon icon={IconDownload} size={16} />
							</a>
							<form action={deleteFileAction.bind(null, "snapshot", file.name)}>
								<button className="grid h-9 w-9 place-items-center rounded-full text-red-600 transition hover:bg-black/5" aria-label={`Delete ${file.name}`}>
									<Icon icon={IconTrash} size={16} />
								</button>
							</form>
						</div>
					))}
					{snapshots.length === 0 && <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted">No snapshots yet.</p>}
				</div>
			</Card>

			<Card title="Configuration exports on disk" text="Files created by the config export button and job, saved under data/exports.">
				<form action={exportConfigAction} className="mb-3">
					<Button type="submit">
						<Icon icon={IconDownload} size={16} /> Export configuration now
					</Button>
				</form>
				<div className="space-y-2">
					{configExports.map((file) => (
						<div key={file.name} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3">
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{prettyStamp(file.name)}</p>
								<p className="truncate text-xs text-faint">{file.name} · {sizeLabel(file.size)}</p>
							</div>
							<a href={`/api/admin/exports/${encodeURIComponent(file.name)}`} download className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-black/5" aria-label={`Download ${file.name}`}>
								<Icon icon={IconDownload} size={16} />
							</a>
							<form action={deleteFileAction.bind(null, "config", file.name)}>
								<button className="grid h-9 w-9 place-items-center rounded-full text-red-600 transition hover:bg-black/5" aria-label={`Delete ${file.name}`}>
									<Icon icon={IconTrash} size={16} />
								</button>
							</form>
						</div>
					))}
					{configExports.length === 0 && <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted">No configuration exports yet.</p>}
				</div>
			</Card>
		</div>
	);
}

export default async function ImportExportPage() {
	return (
		<Suspense>
			<Content />
		</Suspense>
	);
}
