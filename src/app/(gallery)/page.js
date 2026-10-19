import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { listUserMedia } from "@/lib/uploads";
import MediaGrid from "@/components/media-grid";
import MediaTitle, { toPublicUser } from "@/components/media-title";

async function Content({ searchParams }) {
	const { q } = await searchParams;
	const sessionUser = await getSessionUser();
	const user = toPublicUser(sessionUser);
	const photos = await listUserMedia(sessionUser.id, "media");
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title="Media" count={photos.length} user={user} />
			<MediaGrid photos={photos} query={q ?? ""} addable />
		</section>
	);
}

export default async function Page({ searchParams }) {
	return (
		<Suspense>
			<Content searchParams={searchParams} />
		</Suspense>
	);
}
