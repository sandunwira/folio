import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listUserMedia } from "@/lib/uploads";
import MediaGrid from "@/components/media-grid";
import MediaTitle, { toPublicUser } from "@/components/media-title";

async function Content({ searchParams }) {
	const { q } = await searchParams;
	const sessionUser = await getSessionUser();
	if (!sessionUser) redirect("/login");
	const user = toPublicUser(sessionUser);
	const photos = await listUserMedia(sessionUser.id, "archive");
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle
				title="Archive"
				count={photos.length}
				user={user}
				actions={photos.length > 0 ? (
					<a href="/api/archive/download" download className="hidden h-10 items-center gap-2 rounded-full border border-line bg-panel px-4 text-sm font-medium text-ink transition hover:bg-black/5 md:flex">
						Download all (.zip)
					</a>
				) : null}
			/>
			<MediaGrid photos={photos} query={q ?? ""} emptyState={{ iconKey: "photo", title: "No archived items", text: "Move photos here to tuck them away without deleting them." }} />
		</section>
	);
}

export default async function ArchivePage({ searchParams }) {
	return (
		<Suspense>
			<Content searchParams={searchParams} />
		</Suspense>
	);
}
