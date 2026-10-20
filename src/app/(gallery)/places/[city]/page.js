import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listUserMedia } from "@/lib/uploads";
import MediaGrid from "@/components/media-grid";
import MediaTitle, { toPublicUser } from "@/components/media-title";

async function Content({ params }) {
	const { city } = await params;
	const sessionUser = await getSessionUser();
	if (!sessionUser) redirect("/login");
	const user = toPublicUser(sessionUser);
	const photos = (await listUserMedia(sessionUser.id, "media")).filter((photo) => photo.estCity === city);
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title={city} count={photos.length} user={user} />
			<MediaGrid photos={photos} query="" addable emptyState={{ iconKey: "trash", title: "No photos in this place", text: `Nothing from ${city} right now. The album fills in automatically as photos with that location arrive.` }} />
		</section>
	);
}

export default async function PlaceAlbumPage({ params }) {
	return (
		<Suspense>
			<Content params={params} />
		</Suspense>
	);
}
