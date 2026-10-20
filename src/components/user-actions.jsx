"use client";

import { useState, useTransition } from "react";

export default function UserActions({ account, onDelete, onToggle }) {
	const [modal, setModal] = useState(null);
	const [error, setError] = useState(null);
	const [pending, start] = useTransition();

	const open = (modalName) => {
		setError(null);
		setModal(modalName);
	};

	const close = () => {
		setModal(null);
		setError(null);
	};

	const confirm = (action) => {
		const formData = new FormData();
		formData.set("id", String(account.id));
		start(async () => {
			const result = await action(formData);
			if (result?.error) {
				setError(result.error);
				return;
			}
			close();
		});
	};

	const deactivated = account.active === 0;
	const lastIndexAdmin = account.isLastAdmin;
	const deactivateBlocked = account.isSelf || lastIndexAdmin;

	return (
		<>
			<div className="flex items-center gap-2">
				{deactivated ? (
					<span className="rounded-full bg-[#fbeaea] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#c5221f]">Deactivated</span>
				) : (
					<span className="rounded-full bg-[#e6f4ea] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#1e7e34]">Active</span>
				)}
				<button type="button" className="h-9 rounded-full border border-line bg-panel px-4 text-xs font-medium text-ink transition hover:bg-black/5 disabled:cursor-not-allowed disabled:text-faint" disabled={deactivateBlocked} title={account.isSelf ? "You cannot deactivate yourself" : lastIndexAdmin ? "Cannot deactivate the last admin" : undefined} onClick={() => open("deactivate")}>
					Deactivate
				</button>
				<button type="button" className="h-9 rounded-full border border-line bg-panel px-4 text-xs font-medium text-ink transition hover:bg-black/5 disabled:cursor-not-allowed disabled:text-faint" disabled={lastIndexAdmin} title={lastIndexAdmin ? "Cannot delete the last admin" : undefined} onClick={() => open("delete")}>
					Delete
				</button>
			</div>
			{modal && (
				<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5" onClick={close}>
					<div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-6" onClick={(event) => event.stopPropagation()}>
						{modal === "delete" ? (
							<>
								<h2 className="text-lg font-medium">Delete account?</h2>
								<p className="mt-1 text-xs text-muted">&ldquo;@{account.username}&rdquo; is permanently deleted along with their albums, media metadata, and active sessions. This cannot be undone.</p>
								{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
								<div className="mt-5 flex justify-end gap-3">
									<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={close}>
										Cancel
									</button>
									<button type="button" disabled={pending} className="h-10 rounded-full bg-danger px-5 text-sm font-medium text-white transition hover:bg-[#b3261e] disabled:opacity-60" onClick={() => confirm(onDelete)}>
										Delete account
									</button>
								</div>
							</>
						) : (
							<>
								<h2 className="text-lg font-medium">Deactivate account?</h2>
								<p className="mt-1 text-xs text-muted">&ldquo;@{account.username}&rdquo; cannot sign in until the account is re-activated. Their sessions are signed out immediately.</p>
								{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
								<div className="mt-5 flex justify-end gap-3">
									<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={close}>
										Cancel
									</button>
									<button type="button" disabled={pending} className="h-10 rounded-full bg-danger px-5 text-sm font-medium text-white transition hover:bg-[#b3261e] disabled:opacity-60" onClick={() => confirm(onToggle)}>
										Deactivate account
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</>
	);
}
