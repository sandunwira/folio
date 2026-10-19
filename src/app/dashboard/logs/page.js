import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getSessionUser, listEvents } from "@/lib/auth";

const eventFilters = [
	{ key: "", label: "All" },
	{ key: "login_success", label: "Logins" },
	{ key: "login_failed", label: "Failed logins" },
	{ key: "account_created", label: "Account created" },
	{ key: "account_deleted", label: "Account deleted" },
	{ key: "settings_updated", label: "Settings" },
	{ key: "media", label: "Media" },
	{ key: "logout", label: "Logouts" },
];

const eventLabels = {
	login_success: "Login",
	login_failed: "Failed login",
	admin_bootstrapped: "Admin bootstrapped",
	account_created: "Account created",
	account_deleted: "Account deleted",
	settings_updated: "Settings updated",
	media_uploaded: "Media uploaded",
	media_upload_skipped: "Upload skipped",
	media_favorited: "Added to favorites",
	media_unfavorited: "Removed from favorites",
	media_renamed: "Media renamed",
	media_vaulted: "Moved to vault",
	media_unvaulted: "Removed from vault",
	media_archived: "Archived",
	media_unarchived: "Unarchived",
	media_trashed: "Moved to trash",
	media_deleted: "Deleted permanently",
	album_created: "Album created",
	album_renamed: "Album renamed",
	album_deleted: "Album deleted",
	media_added_to_album: "Added to album",
	media_removed_from_album: "Removed from album",
	logout: "Logout",
};

async function Content({ searchParams }) {
	const user = await getSessionUser();
	if (!user?.isAdmin) redirect("/");
	const { type } = await searchParams;
	const events = listEvents(100, type || undefined)
		.map((event) => ({
			...event,
			time: new Date(event.created_at).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
		}));

	return (
		<div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
			<div>
				<h1 className="text-[22px] font-medium">Audit logs</h1>
				<p className="mt-1 text-sm text-muted">Server and account activity. Media contents are never logged — only who did what, and when.</p>
			</div>

			<div className="flex flex-wrap gap-2">
				{eventFilters.map((filter) => {
					const href = filter.key ? `/dashboard/logs?type=${filter.key}` : "/dashboard/logs";
					const active = (type ?? "") === filter.key;
					return (
						<Link key={filter.label} href={href} className={`h-8 rounded-full border px-4 text-xs font-medium leading-8 transition ${active ? "border-ink bg-ink text-white" : "border-line bg-panel text-ink hover:bg-black/5"}`}>
							{filter.label}
						</Link>
					);
				})}
			</div>

			<section className="rounded-3xl border border-line bg-panel">
				<ul className="divide-y divide-line">
					{events.map((event) => {
						const isFailure = event.type === "login_failed";
						return (
							<li key={event.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-6 py-3.5">
								<span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${isFailure ? "bg-[#fbeaea] text-[#c5221f]" : "bg-[#f1f1f1] text-muted"}`}>
									{eventLabels[event.type] ?? event.type}
								</span>
								<span className="text-sm font-medium">{event.actor || "unknown"}</span>
								<span className="min-w-0 flex-1 truncate text-sm text-muted">{event.detail}</span>
								<span className="text-xs tabular-nums text-faint">{event.time}</span>
							</li>
						);
					})}
					{events.length === 0 && <li className="px-6 py-10 text-center text-sm text-muted">No events recorded yet.</li>}
				</ul>
			</section>
		</div>
	);
}

export default async function AdminLogsPage(props) {
	return (
		<Suspense>
			<Content searchParams={props.searchParams} />
		</Suspense>
	);
}
