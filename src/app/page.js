import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSettings, getSessionUser } from "@/lib/auth";
import { computeUsedGb } from "@/lib/storage";
import Gallery from "@/components/Gallery";

async function Content() {
	const user = await getSessionUser();
	if (!user) redirect("/login");
	const settings = getSettings();
	if (settings.maintenance === "on" && !user.isAdmin) {
		return (
			<div className="grid min-h-screen place-items-center bg-surface p-5 text-ink">
				<div className="text-center">
					<p className="text-xl font-medium">{settings.app_name}</p>
					<p className="mt-3 max-w-sm text-sm text-muted">{settings.app_name} is under maintenance right now. Please come back a bit later.</p>
				</div>
			</div>
		);
	}
	const computedUsedGb = await computeUsedGb();
	const usedGb = computedUsedGb ?? Number(settings.used_gb);
	return <Gallery user={user} settings={{ appName: settings.app_name, quotaGb: Number(settings.quota_gb), usedGb }} />;
}

export default async function Home() {
	return (
		<Suspense>
			<Content />
		</Suspense>
	);
}
