import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSessionUser, getAlbum } from "@/lib/auth";
import { listAlbumMedia } from "@/lib/uploads";
import MediaGrid from "@/components/media-grid";
import AlbumMenu from "@/components/album-menu";
import MediaTitle, { toPublicUser } from "@/components/media-title";

async function Content({ params }) {
	const { id } = await params;
	const sessionUser = await getSessionUser();
	const user = toPublicUser(sessionUser);
	const album = getAlbum(sessionUser.id, Number(id));
	if (!album || !sessionUser) notFound();
	const photos = listAlbumMedia(sessionUser.id, album.id);
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title={album.name} count={photos.length} user={user} actions={<AlbumMenu album={{ id: album.id, name: album.name }} variant="page" deletedHref="/albums" />} />
			<MediaGrid photos={photos} query="" removableAlbumId={album.id} emptyState={{ iconKey: "photo", title: "No items in this album", text: "Add photos with the album button on any photo in the media page or the lightbox." }} />
		</section>
	);
}

export default async function AlbumDetailPage({ params }) {
	return (
		<Suspense>
			<Content params={params} />
		</Suspense>
	);
}
