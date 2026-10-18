import { redirect } from "next/navigation";
import { Suspense } from "react";
import { countUsers, getSessionUser } from "@/lib/auth";
import { loginAction, setupAdminAction } from "@/lib/actions";

export const metadata = { title: "Sign in | Folio" };

function Logo() {
	return (
		<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-ink">
			<path d="M12 2a10 10 0 0 1 10 10h-7a3 3 0 0 0-3-3V2z" fill="currentColor" />
			<path d="M5 8a10 10 0 0 1 10 10H8a3 3 0 0 0-3-3V8z" fill="currentColor" transform="rotate(90 12 12)" />
			<path d="M2 12a10 10 0 0 0 10 10v-7a3 3 0 0 1-3-3H2z" fill="currentColor" transform="rotate(-90 12 12)" />
			<path d="M2 12A10 10 0 0 1 12 2v7a3 3 0 0 0-3 3H2z" fill="currentColor" />
			<circle cx="12" cy="12" r="3.4" fill="#fff" />
		</svg>
	);
}

async function Content({ params }) {
	const user = await getSessionUser();
	if (user) redirect("/");
	const { error } = await params;
	const isFirstUser = countUsers() === 0;

	return (
		<div className="grid min-h-screen place-items-center bg-surface p-5">
			<div className="w-full max-w-sm">
				<div className="flex flex-col items-center">
					<Logo />
					<p className="mt-3 text-xl font-medium text-ink">Folio</p>
					<p className="text-sm text-muted">Your personal archive</p>
				</div>
				<div className="mt-8 rounded-3xl border border-line bg-panel p-7">
					{error && <p className="mb-4 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
					{isFirstUser ? (
						<>
							<h1 className="text-lg font-medium text-ink">Set up admin account</h1>
							<p className="mt-1 text-xs text-muted">This first account will own the archive and manage other local accounts.</p>
							<form action={setupAdminAction} className="mt-5 flex flex-col gap-3">
								<label className="flex flex-col gap-1.5">
									<span className="text-xs font-medium text-ink">Display name</span>
									<input name="name" autoFocus required placeholder="Alex Morgan" className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-faint focus:border-ink" />
								</label>
								<label className="flex flex-col gap-1.5">
									<span className="text-xs font-medium text-ink">Username</span>
									<input name="username" required pattern="[a-z0-9_.\-]+" placeholder="alex" className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-faint focus:border-ink" />
								</label>
								<label className="flex flex-col gap-1.5">
									<span className="text-xs font-medium text-ink">Password</span>
									<input name="password" type="password" required minLength={6} placeholder="At least 6 characters" className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-faint focus:border-ink" />
								</label>
								<label className="flex flex-col gap-1.5">
									<span className="text-xs font-medium text-ink">Confirm password</span>
									<input name="confirm" type="password" required placeholder="Repeat password" className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-faint focus:border-ink" />
								</label>
								<button className="mt-2 h-10 rounded-full bg-ink text-sm font-medium text-white transition hover:bg-black">Create admin account</button>
							</form>
						</>
					) : (
						<>
							<h1 className="text-lg font-medium text-ink">Sign in</h1>
							<p className="mt-1 text-xs text-muted">Use your local Folio account.</p>
							<form action={loginAction} className="mt-5 flex flex-col gap-3">
								<label className="flex flex-col gap-1.5">
									<span className="text-xs font-medium text-ink">Username</span>
									<input name="username" autoFocus required className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-ink" />
								</label>
								<label className="flex flex-col gap-1.5">
									<span className="text-xs font-medium text-ink">Password</span>
									<input name="password" type="password" required className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-ink" />
								</label>
								<button className="mt-2 h-10 rounded-full bg-ink text-sm font-medium text-white transition hover:bg-black">Sign in</button>
							</form>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export default async function LoginPage(props) {
	return (
		<Suspense>
			<Content params={props.searchParams} />
		</Suspense>
	);
}
