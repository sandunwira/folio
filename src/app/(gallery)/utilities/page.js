import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { IconWand } from "@tabler/icons-react";
import MediaTitle, { toPublicUser } from "@/components/media-title";

async function Content() {
	const user = toPublicUser(await getSessionUser());
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title="Utilities" count={0} user={user} />
			<div className="py-28 text-center">
				<IconWand className="mx-auto text-faint" size={32} stroke={1.8} aria-hidden="true" />
				<h2 className="mt-4 text-lg font-medium">Nothing to do here yet</h2>
				<p className="mx-auto mt-1 max-w-sm text-sm text-muted">Utilities like free up space, collages and animations will be available here.</p>
			</div>
		</section>
	);
}

export default async function UtilitiesPage() {
	return (
		<Suspense>
			<Content />
		</Suspense>
	);
}
