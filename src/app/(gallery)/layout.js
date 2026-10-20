import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSettings, getSessionUser } from "@/lib/auth";
import { computeUsedGb } from "@/lib/storage";
import GalleryChrome from "@/components/gallery-chrome";

function ShellFallback() {
	return (
		<div className="min-h-screen bg-surface text-ink">
			<aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-panel md:block" />
		</div>
	);
}

async function LayoutContent({ children }) {
	const sessionUser = await getSessionUser();
	if (!sessionUser) redirect("/login");
	const settings = getSettings();
	if (settings.maintenance === "on" && !sessionUser.isAdmin) {
		return (
			<div className="grid min-h-screen place-items-center bg-surface p-5 text-ink">
				<div className="text-center">
					<p className="text-xl font-medium">Folio</p>
					<p className="mt-3 max-w-sm text-sm text-muted">Folio is under maintenance right now. Please come back a bit later.</p>
				</div>
			</div>
		);
	}
	const computedUsedGb = await computeUsedGb();
	const usedGb = computedUsedGb ?? Number(settings.used_gb);
	const quotaGb = Number(settings.quota_gb);
	const storage = {
		usedGb,
		quotaGb,
		percent: quotaGb > 0 ? Math.min(100, (usedGb / quotaGb) * 100) : 0,
	};
	return (
		<div className="min-h-screen bg-surface text-ink">
			<GalleryChrome brand="Folio" storage={storage} user={{ name: sessionUser.name, username: sessionUser.username, isAdmin: !!sessionUser.isAdmin }} />
			<main className="md:ml-64">{children}</main>
		</div>
	);
}

export default function GalleryLayout({ children }) {
	return (
		<Suspense fallback={<ShellFallback />}>
			<LayoutContent>
				{children}
			</LayoutContent>
		</Suspense>
	);
}
