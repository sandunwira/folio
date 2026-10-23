"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { IconDotsVertical } from "@tabler/icons-react";
import Icon from "@/components/icon";

export default function UserActions({ account, onDelete, onToggle, onResetPassword, onResetVaultPin }) {
	const [modal, setModal] = useState(null);
	const [error, setError] = useState(null);
	const [newPassword, setNewPassword] = useState("");
	const [pending, start] = useTransition();
	const menuOpen = modal === "delete-menu";
	const menuRef = useRef(null);

	const openModal = (modalName) => {
		setError(null);
		setNewPassword("");
		setModal(modalName);
	};

	const close = () => {
		setModal(null);
		setError(null);
		setNewPassword("");
	};

	const confirmWith = (action, formData) => {
		start(async () => {
			const result = await action(formData);
			if (result?.error) {
				setError(result.error);
				return;
			}
			close();
		});
	};

	const confirmSimple = (action) => {
		const formData = new FormData();
		formData.set("id", String(account.id));
		confirmWith(action, formData);
	};

	const confirmReset = () => {
		const formData = new FormData();
		formData.set("id", String(account.id));
		formData.set("newPassword", newPassword);
		confirmWith(onResetPassword, formData);
	};

	useEffect(() => {
		if (!menuOpen) return;
		const onPointerDown = (event) => {
			if (menuRef.current && !menuRef.current.contains(event.target)) setModal(null);
		};
		const onKeyDown = (event) => {
			if (event.key === "Escape") setModal(null);
		};
		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [menuOpen]);

	const deactivated = account.active === 0;
	const lastIndexAdmin = account.isLastAdmin;
	const deactivateBlocked = account.isSelf || lastIndexAdmin;
	const deactivateTitle = account.isSelf ? "You cannot deactivate yourself" : lastIndexAdmin ? "Cannot deactivate the last admin" : undefined;

	return (
		<>
			<div className="relative" ref={menuRef}>
				<button type="button" className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-black/5" aria-label={`Manage ${account.username}`} aria-expanded={menuOpen} onClick={() => (menuOpen ? close() : openModal("delete-menu"))}>
					<Icon icon={IconDotsVertical} size={16} />
				</button>
				{menuOpen && (
					<div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-line bg-panel p-1.5 shadow-xl">
						<button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-black/5" disabled={deactivateBlocked} title={deactivateTitle} onClick={() => openModal("deactivate")}>
							{deactivated ? "Activate account" : "Deactivate account"}
						</button>
						<button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-black/5" onClick={() => openModal("reset")}>
							Reset password
						</button>
						<button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-black/5" onClick={() => openModal("vault")}>
							Reset vault PIN
						</button>
						<button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#c5221f] transition hover:bg-black/5" disabled={lastIndexAdmin} title={lastIndexAdmin ? "Cannot delete the last admin" : undefined} onClick={() => openModal("delete")}>
							Delete account
						</button>
					</div>
				)}
			</div>
			{modal && modal !== "delete-menu" && (
				<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5" onClick={close}>
					<div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-6" onClick={(event) => event.stopPropagation()}>
						{modal === "delete" && (
							<>
								<h2 className="text-lg font-medium">Delete account?</h2>
								<p className="mt-1 text-xs text-muted">&ldquo;@{account.username}&rdquo; is permanently deleted along with their albums, media metadata, and active sessions. This cannot be undone.</p>
								{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
								<div className="mt-5 flex justify-end gap-3">
									<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={close}>
										Cancel
									</button>
									<button type="button" disabled={pending} className="h-10 rounded-full bg-danger px-5 text-sm font-medium text-white transition hover:bg-[#b3261e] disabled:opacity-60" onClick={() => confirmSimple(onDelete)}>
										Delete account
									</button>
								</div>
							</>
						)}
						{modal === "deactivate" && (
							<>
								<h2 className="text-lg font-medium">{deactivated ? "Activate account?" : "Deactivate account?"}</h2>
								<p className="mt-1 text-xs text-muted">
									{deactivated
										? `“@${account.username}” can sign in again right after activation.`
										: `“@${account.username}” cannot sign in until the account is re-activated. Their sessions are signed out immediately.`}
								</p>
								{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
								<div className="mt-5 flex justify-end gap-3">
									<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={close}>
										Cancel
									</button>
									<button type="button" disabled={pending} className={`h-10 rounded-full px-5 text-sm font-medium text-white transition disabled:opacity-60 ${deactivated ? "bg-ink hover:bg-black" : "bg-danger hover:bg-[#b3261e]"}`} onClick={() => confirmSimple(onToggle)}>
										{deactivated ? "Activate account" : "Deactivate account"}
									</button>
								</div>
							</>
						)}
						{modal === "reset" && (
							<>
								<h2 className="text-lg font-medium">Reset password</h2>
								<p className="mt-1 text-xs text-muted">Set a new password for &ldquo;@{account.username}&rdquo;{account.isSelf ? "" : ", their active sessions will be signed out."}</p>
								<input type="password" autoFocus required minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password (at least 6 characters)" className="mt-4 h-10 w-full rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-faint focus:border-ink" />
								{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
								<div className="mt-5 flex justify-end gap-3">
									<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={close}>
										Cancel
									</button>
									<button type="button" disabled={pending || newPassword.length < 6} className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60" onClick={confirmReset}>
										Set new password
									</button>
								</div>
							</>
						)}
						{modal === "vault" && (
							<>
								<h2 className="text-lg font-medium">Reset vault PIN?</h2>
								<p className="mt-1 text-xs text-muted">The vault PIN of &ldquo;@{account.username}&rdquo; is cleared, along with any lockout from failed attempts. You cannot choose a new PIN for them, only that user can set up their own vault PIN on the vault page.</p>
								{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
								<div className="mt-5 flex justify-end gap-3">
									<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={close}>
										Cancel
									</button>
									<button type="button" disabled={pending} className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60" onClick={() => confirmSimple(onResetVaultPin)}>
										Reset vault PIN
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
