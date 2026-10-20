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
	const photos = await listUserMedia(sessionUser.id, "vault");
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title="Vault" count={photos.length} user={user} />
			<MediaGrid photos={photos} query={q ?? ""} emptyState={{ iconKey: "lock", title: "No items in your vault", text: "Items you move here stay hidden from your grid, search and memories until you unlock them." }} />
		</section>
	);
}

export default async function VaultPage({ searchParams }) {
	return (
		<Suspense>
			<Content searchParams={searchParams} />
		</Suspense>
	);
}
