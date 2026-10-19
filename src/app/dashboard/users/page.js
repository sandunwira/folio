import { redirect } from "next/navigation";
import { Suspense } from "react";
import { IconShieldLock } from "@tabler/icons-react";
import { getSessionUser, listUsers } from "@/lib/auth";
import { createUserAction, deleteUserAction } from "@/lib/actions";

function Avatar({ name }) {
	return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-medium text-white">{(name?.[0] ?? "?").toUpperCase()}</span>;
}

async function Content({ searchParams }) {
	const user = await getSessionUser();
	if (!user?.isAdmin) redirect("/");
	const { error } = await searchParams;
	const users = listUsers();

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
			<div>
				<h1 className="text-[22px] font-medium">User management</h1>
				<p className="mt-1 text-sm text-muted">Create and manage local accounts. Only admins can do this.</p>
			</div>

			{error && <p className="rounded-lg bg-[#fbeaea] px-4 py-2.5 text-sm text-[#c5221f]">{error}</p>}

			<section className="rounded-3xl border border-line bg-panel p-6">
				<h2 className="text-base font-medium">Create a local account</h2>
				<form action={createUserAction} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<label className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-ink">Display name</span>
						<input name="name" required placeholder="Jamie Rivera" className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-faint focus:border-ink" />
					</label>
					<label className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-ink">Username</span>
						<input name="username" required pattern="[a-z0-9_.\-]+" placeholder="jamie" className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-faint focus:border-ink" />
					</label>
					<label className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-ink">Password</span>
						<input name="password" type="password" required minLength={6} placeholder="At least 6 characters" className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-faint focus:border-ink" />
					</label>
					<div className="flex items-end gap-4">
						<label className="flex min-h-10 items-center gap-2 text-sm text-ink">
							<input name="admin" type="checkbox" className="h-4 w-4 accent-black" />
							Make admin
						</label>
						<button className="h-10 flex-1 rounded-full bg-ink text-sm font-medium text-white transition hover:bg-black sm:flex-none sm:px-6">Create account</button>
					</div>
				</form>
			</section>

			<section className="rounded-3xl border border-line bg-panel">
				<div className="border-b border-line px-6 py-4">
					<h2 className="text-base font-medium">Accounts</h2>
					<p className="mt-1 text-xs text-muted">{users.length} account{users.length === 1 ? "" : "s"} · you cannot delete your own account or the last admin.</p>
				</div>
				<ul className="divide-y divide-line">
					{users.map((account) => {
						const isSelf = account.id === user.id;
						const isLastAdmin = account.is_admin === 1 && users.filter((u) => u.is_admin === 1).length === 1;
						return (
							<li key={account.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
								<Avatar name={account.display_name} />
								<div className="min-w-0 flex-1">
									<p className="flex items-center gap-2 truncate text-sm font-medium">
										{account.display_name}
										{account.is_admin === 1 && (
											<span className="flex items-center gap-1 rounded-full bg-[#f1f1f1] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
												<IconShieldLock size={10} /> Admin
											</span>
										)}
									</p>
									<p className="truncate text-xs text-muted">@{account.username}</p>
								</div>
								{isSelf ? (
									<span className="text-xs text-faint">You</span>
								) : (
									<form action={deleteUserAction}>
										<input type="hidden" name="id" value={account.id} />
										<button className="h-9 rounded-full border border-line bg-panel px-4 text-xs font-medium text-ink transition hover:bg-black/5 disabled:cursor-not-allowed disabled:text-faint" disabled={isLastAdmin} title={isLastAdmin ? "Cannot delete the last admin" : undefined}>
											Delete
										</button>
									</form>
								)}
							</li>
						);
					})}
				</ul>
			</section>
		</div>
	);
}

export default async function AdminUsersPage(props) {
	return (
		<Suspense>
			<Content searchParams={props.searchParams} />
		</Suspense>
	);
}
