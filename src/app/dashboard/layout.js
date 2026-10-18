import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { IconChevronLeft, IconPower } from "@tabler/icons-react";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import AdminNav from "./AdminNav";

export const metadata = { title: "Admin | Folio" };

async function AdminSidebarContent() {
	const user = await getSessionUser();
	if (!user?.isAdmin) redirect("/");

	return (
		<>
			<div className="flex items-center gap-3 px-4 py-2 md:px-6">
				<Link href="/" className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-black/5 hover:text-ink" aria-label="Back to archive">
					<IconChevronLeft size={16} />
				</Link>
				<img src="/icon.png" alt="Logo" width={24} height={24} />
				<span className="truncate text-sm font-semibold tracking-tight text-ink">Admin</span>
			</div>
			<div className="mt-5 flex-1 overflow-y-auto pb-4 scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-track]:bg-transparent">
				<AdminNav />
			</div>
			<div className="border-t border-line px-2 pb-2 pt-3 md:px-4">
				<div className="flex items-center gap-3 px-2 pb-1 md:px-3">
					<span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-medium text-white">{(user.name?.[0] ?? "?").toUpperCase()}</span>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium text-ink">{user.name}</p>
						<p className="truncate text-xs text-muted">@{user.username}</p>
					</div>
					<form action={logoutAction}>
						<button className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-black/5 hover:text-ink" aria-label="Log out">
							<IconPower size={16} />
						</button>
					</form>
				</div>
			</div>
		</>
	);
}

export default async function AdminLayout({ children }) {
	return (
		<div className="min-h-screen bg-surface text-ink">
			<aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-panel px-3 py-4 md:flex">
				<Suspense fallback={<div className="flex-1" />}>
					<AdminSidebarContent />
				</Suspense>
			</aside>
			<header className="flex h-14 items-center gap-3 border-b border-line bg-panel px-4 md:hidden">
				<Link href="/" className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-black/5" aria-label="Back to archive">
					<IconChevronLeft size={18} />
				</Link>
				<span className="text-sm font-medium">Admin</span>
			</header>
			<div className="md:ml-64">
				<Suspense>{children}</Suspense>
			</div>
		</div>
	);
}
