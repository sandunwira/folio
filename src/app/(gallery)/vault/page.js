import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MAX_VAULT_ATTEMPTS, getSessionUser, getUserById, hasVaultAccess } from "@/lib/auth";
import { unlockVaultAction, setupVaultPinAction } from "@/lib/actions";
import { listUserMedia } from "@/lib/uploads";
import MediaGrid from "@/components/media-grid";
import MediaTitle, { toPublicUser } from "@/components/media-title";
import VaultGate from "@/components/vault-gate";

async function Content({ searchParams }) {
	const { q } = await searchParams;
	const sessionUser = await getSessionUser();
	if (!sessionUser) redirect("/login");
	const user = toPublicUser(sessionUser);
	const account = getUserById(sessionUser.id);

	if (account.vault_attempts >= MAX_VAULT_ATTEMPTS) {
		return <VaultGate mode="locked" />;
	}
	if (!account.vault_pin_hash) {
		return <VaultGate mode="setup" setupAction={setupVaultPinAction} />;
	}
	if (!(await hasVaultAccess(sessionUser.id))) {
		return <VaultGate mode="unlock" unlockAction={unlockVaultAction} />;
	}

	const photos = await listUserMedia(sessionUser.id, "vault");
	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<MediaTitle title="Vault" count={photos.length} user={user} />
			<MediaGrid photos={photos} query={q ?? ""} emptyState={{ iconKey: "lock", title: "No items in your vault", text: "Items you move here stay hidden from your grid, search and memories until you unlock them." }} />
		</section>
	);
}

export default async function VaultPage({ searchParams }) {
	return (<Suspense><Content searchParams={searchParams} /></Suspense>);
}
