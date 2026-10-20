import { Suspense } from "react";
import Link from "next/link";
import { IconAlbum, IconPlus } from "@tabler/icons-react";
import { getSessionUser, listAlbums } from "@/lib/auth";
import { redirect } from "next/navigation";
import NewAlbumForm from "@/components/new-album-form";
import AlbumMenu from "@/components/album-menu";
import CoverThumb from "@/components/cover-thumb";
import MediaTitle, { toPublicUser } from "@/components/media-title";

async function Content({ searchParams }) {
	const { q } = await searchParams;
	const query = (q ?? "").toLowerCase();
	const sessionUser = await getSessionUser();
	if (!sessionUser) redirect("/login");
	const user = toPublicUser(sessionUser);
	const visibleAlbums = listAlbums(sessionUser.id).filter((album) => !query || album.name.toLowerCase().includes(query));
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title="Albums" count={visibleAlbums.length} user={user} />
			<div className="flex flex-wrap justify-between gap-4 py-4">
				<NewAlbumForm />
			</div>
			{visibleAlbums.length > 0 ? (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
					{visibleAlbums.map((album) => (
						<div key={album.id} className="group relative">
							<Link href={`/albums/${album.id}`} className="block">
								<div className="relative aspect-square overflow-hidden rounded-xl bg-[#ececec]">
									{album.cover_media_id ? <CoverThumb src={`/api/media/${album.cover_media_id}/thumb`} alt={album.name} /> : (
										<div className="grid h-full w-full place-items-center text-muted">
											<IconAlbum size={28} stroke={1.5} aria-hidden="true" />
										</div>
									)}
								</div>
								<p className="mt-2.5 truncate text-sm font-medium">{album.name}</p>
								<p className="text-xs text-muted">{album.item_count} {album.item_count === 1 ? "item" : "items"}</p>
							</Link>
							<div className="absolute right-2 top-2">
								<AlbumMenu album={{ id: album.id, name: album.name }} variant="card" deletedHref="/albums" />
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="py-28 text-center">
					<IconPlus className="mx-auto text-faint" size={32} stroke={1.8} aria-hidden="true" />
					<h2 className="mt-4 text-lg font-medium">{query ? "No results found" : "No albums yet"}</h2>
					<p className="mx-auto mt-1 max-w-sm text-sm text-muted">{query ? `No matches for "${query}". Try a different search.` : "Create an album above and add photos to it from the media page or the lightbox."}</p>
				</div>
			)}
		</section>
	);
}

export default async function AlbumsPage({ searchParams }) {
	return (
		<Suspense>
			<Content searchParams={searchParams} />
		</Suspense>
	);
}
