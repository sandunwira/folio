import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { IconUsers } from "@tabler/icons-react";
import MediaTitle, { toPublicUser } from "@/components/media-title";

async function Content() {
	const sessionUser = await getSessionUser();
	const user = toPublicUser(sessionUser);
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title="People" count={0} user={user} />
			<div className="flex flex-col items-center gap-3 py-24 text-center">
				<div className="grid h-16 w-16 place-items-center rounded-full bg-panel text-muted">
					<IconUsers size={28} stroke={1.5} aria-hidden="true" />
				</div>
				<p className="text-sm font-medium text-ink">People tagging coming soon</p>
				<p className="max-w-xs text-xs text-muted">Group photos by the people in them once face grouping is added to this archive.</p>
			</div>
		</section>
	);
}

export default async function PeoplePage() {
	return (
		<Suspense>
			<Content />
		</Suspense>
	);
}
