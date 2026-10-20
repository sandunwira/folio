import { Suspense } from "react";
import { getSessionUser, getSettings } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listUserMedia } from "@/lib/uploads";
import MediaGrid from "@/components/media-grid";
import MediaTitle, { toPublicUser } from "@/components/media-title";

async function Content({ searchParams }) {
	const { q } = await searchParams;
	const sessionUser = await getSessionUser();
	if (!sessionUser) redirect("/login");
	const user = toPublicUser(sessionUser);
	const photos = await listUserMedia(sessionUser.id, "trash");
	const days = Number(getSettings().trash_days) || 60;
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title="Trash" count={photos.length} user={user} />
			<MediaGrid photos={photos} query={q ?? ""} restore emptyState={{ iconKey: "trash", title: "No items in Trash", text: `Deleted photos and videos are kept here for ${days} days before being removed forever.` }} />
		</section>
	);
}

export default async function TrashPage({ searchParams }) {
	return (
		<Suspense>
			<Content searchParams={searchParams} />
		</Suspense>
	);
}
