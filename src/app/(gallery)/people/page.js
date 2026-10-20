import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IconUsers } from "@tabler/icons-react";
import MediaTitle, { toPublicUser } from "@/components/media-title";

async function Content() {
	const sessionUser = await getSessionUser();
	if (!sessionUser) redirect("/login");
	const user = toPublicUser(sessionUser);
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title="People" count={0} user={user} />
			<div className="py-28 text-center">
				<IconUsers className="mx-auto text-faint" size={32} stroke={1.8} aria-hidden="true" />
				<h2 className="mt-4 text-lg font-medium">People tagging coming soon</h2>
				<p className="mx-auto mt-1 max-w-sm text-sm text-muted">Group photos by the people in them once face grouping is added to this archive.</p>
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
