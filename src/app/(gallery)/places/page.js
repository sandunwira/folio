import { Suspense } from "react";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listUserMedia } from "@/lib/uploads";
import MediaTitle, { toPublicUser } from "@/components/media-title";

async function Content({ searchParams }) {
	const { q } = await searchParams;
	const query = (q ?? "").toLowerCase();
	const sessionUser = await getSessionUser();
	const user = toPublicUser(sessionUser);
	const photos = await listUserMedia(sessionUser.id, "media");
	const places = photos.reduce((placeList, photo) => {
		if (!photo.location) return placeList;
		if (query && !photo.location.toLowerCase().includes(query)) return placeList;
		const existing = placeList.find((place) => place.name === photo.location);
		if (existing) existing.count += 1;
		else placeList.push({ name: photo.location, cover: photo.image, count: 1 });
		return placeList;
	}, []);
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title="Places" count={places.length} user={user} />
			{places.length > 0 ? (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
					{places.map((place) => (
						<Link key={place.name} href="/" className="group">
							<div className="relative aspect-square overflow-hidden rounded-xl bg-[#ececec]">
								<img src={place.cover} alt={place.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
							</div>
							<p className="mt-2.5 truncate text-sm font-medium">{place.name}</p>
							<p className="text-xs text-muted">{place.count} items</p>
						</Link>
					))}
				</div>
			) : (
				<div className="py-28 text-center">
					<h2 className="mt-4 text-lg font-medium">{query ? "No results found" : "No places yet"}</h2>
					<p className="mx-auto mt-1 max-w-sm text-sm text-muted">{query ? `No matches for "${query}". Try a different search.` : "Photos with locations will show up here."}</p>
				</div>
			)}
		</section>
	);
}

export default async function PlacesPage({ searchParams }) {
	return (
		<Suspense>
			<Content searchParams={searchParams} />
		</Suspense>
	);
}
