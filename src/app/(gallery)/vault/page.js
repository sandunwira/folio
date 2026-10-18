import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { IconLock } from "@tabler/icons-react";
import MediaTitle, { toPublicUser } from "@/components/media-title";

async function Content() {
	const user = toPublicUser(await getSessionUser());
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title="Vault" count={0} user={user} />
			<div className="py-28 text-center">
				<IconLock className="mx-auto text-faint" size={32} stroke={1.8} aria-hidden="true" />
				<h2 className="mt-4 text-lg font-medium">No items in your vault</h2>
				<p className="mx-auto mt-1 max-w-sm text-sm text-muted">Items you move here stay hidden from your grid, search and memories until you unlock them.</p>
			</div>
		</section>
	);
}

export default async function VaultPage() {
	return (
		<Suspense>
			<Content />
		</Suspense>
	);
}
