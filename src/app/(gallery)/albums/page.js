import { Suspense } from "react";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { albums } from "@/lib/media-data";
import MediaTitle, { toPublicUser } from "@/components/media-title";

async function Content({ searchParams }) {
	const { q } = await searchParams;
	const query = (q ?? "").toLowerCase();
	const user = toPublicUser(await getSessionUser());
	const visibleAlbums = albums.filter((album) => !query || album.name.toLowerCase().includes(query));
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title="Albums" count={visibleAlbums.length} user={user} />
			{visibleAlbums.length > 0 ? (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
					{visibleAlbums.map((album) => (
						<Link key={album.name} href="/" className="group">
							<div className="relative aspect-square overflow-hidden rounded-xl bg-[#ececec]">
								<img src={album.cover} alt={album.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
							</div>
							<p className="mt-2.5 truncate text-sm font-medium">{album.name}</p>
						</Link>
					))}
				</div>
			) : (
				<div className="py-28 text-center">
					<h2 className="mt-4 text-lg font-medium">{q ? "No results found" : "No albums yet"}</h2>
					<p className="mx-auto mt-1 max-w-sm text-sm text-muted">{q ? `No matches for "${q}". Try a different search.` : "Create an album to group your memories."}</p>
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
