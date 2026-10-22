"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconLockOpen, IconLock } from "@tabler/icons-react";
import Icon from "@/components/icon";

const pinPattern = /^\d{4}$/;

export default function VaultGate({ mode, setupAction, unlockAction }) {
	const [open, setOpen] = useState(true);
	const [pin, setPin] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState(null);
	const [pending, start] = useTransition();
	const router = useRouter();

	const resetForm = () => {
		setPin("");
		setConfirm("");
		setError(null);
	};

	const submitSetup = () => {
		start(async () => {
			const formData = new FormData();
			formData.set("pin", pin);
			formData.set("confirm", confirm);
			const result = await setupAction(formData);
			if (result?.error) {
				setError(result.error);
				return;
			}
			resetForm();
			router.refresh();
		});
	};

	const submitUnlock = () => {
		start(async () => {
			const formData = new FormData();
			formData.set("pin", pin);
			const result = await unlockAction(formData);
			if (result?.error) {
				setError(result.error);
				setPin("");
				if (result.locked) {
					setOpen(false);
					router.refresh();
				}
				return;
			}
			resetForm();
			router.refresh();
		});
	};

	if (mode === "locked") {
		return (
			<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
				{!open && (
					<div className="mt-24 flex flex-col items-center rounded-3xl border border-line bg-panel px-6 py-14 text-center">
						<div className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-ink">
							<Icon icon={IconLock} size={20} />
						</div>
						<h2 className="mt-4 text-base font-medium">Vault is locked</h2>
						<p className="mt-1 text-xs text-muted">Too many unsuccessful attempts. Ask an admin to reset your vault PIN.</p>
					</div>
				)}
				{open && (
					<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5" onClick={() => setOpen(false)}>
						<div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-6" onClick={(event) => event.stopPropagation()}>
							<h2 className="text-lg font-medium">Vault can&rsquo;t be unlocked at this time</h2>
							<p className="mt-1 text-xs text-muted">Your vault is locked because of exceeding the maximum number of unsuccessful attempts. Ask an admin to reset your vault PIN, and then you will be able to set up the PIN again.</p>
							<div className="mt-5 flex justify-end">
								<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={() => setOpen(false)}>
									Close
								</button>
							</div>
						</div>
					</div>
				)}
			</section>
		);
	}

	if (!open) {
		return (
			<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
				<div className="mt-24 flex flex-col items-center rounded-3xl border border-line bg-panel px-6 py-14 text-center">
					<div className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-ink">
						<Icon icon={IconLockOpen} size={20} />
					</div>
					<h2 className="mt-4 text-base font-medium">{mode === "setup" ? "Set up your vault" : "Protected vault"}</h2>
					<p className="mt-1 text-xs text-muted">{mode === "setup" ? "Choose a 4-digit PIN to secure your vault." : "Enter your vault PIN to view its contents."}</p>
					<button type="button" className="mt-5 h-10 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black" onClick={() => { resetForm(); setOpen(true); }}>
						{mode === "setup" ? "Set up PIN" : "Enter PIN"}
					</button>
				</div>
			</section>
		);
	}

	return (
		<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
			<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5" onClick={() => setOpen(false)}>
				<div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-6" onClick={(event) => event.stopPropagation()}>
					{mode === "setup" && (
						<>
							<h2 className="text-lg font-medium">Set up your vault PIN</h2>
							<p className="mt-1 text-xs text-muted">Choose a 4-digit PIN to protect your vault. You will need it every time you open the vault.</p>
							<input type="password" autoFocus inputMode="numeric" pattern="[0-9]*" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4-digit PIN" className="mx-auto mt-5 block h-14 w-44 rounded-2xl border border-line bg-surface text-center text-2xl tracking-[0.5em] text-ink outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-faint focus:border-ink" />
							<input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Confirm PIN" className="mx-auto mt-3 block h-14 w-44 rounded-2xl border border-line bg-surface text-center text-2xl tracking-[0.5em] text-ink outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-faint focus:border-ink" />
							{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
							<div className="mt-5 flex justify-end gap-3">
								<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={() => setOpen(false)}>
									Cancel
								</button>
								<button type="button" disabled={pending || !pinPattern.test(pin) || !pinPattern.test(confirm)} className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60" onClick={submitSetup}>
									Set up PIN
								</button>
							</div>
						</>
					)}
					{mode === "unlock" && (
						<>
							<h2 className="text-lg font-medium">Enter your vault PIN</h2>
							<p className="mt-1 text-xs text-muted">Your vault contents are hidden until you enter the correct 4-digit PIN.</p>
							<input type="password" autoFocus inputMode="numeric" pattern="[0-9]*" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4-digit PIN" className="mx-auto mt-5 block h-14 w-44 rounded-2xl border border-line bg-surface text-center text-2xl tracking-[0.5em] text-ink outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-faint focus:border-ink" />
							{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
							<div className="mt-5 flex justify-end gap-3">
								<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={() => setOpen(false)}>
									Cancel
								</button>
								<button type="button" disabled={pending || pin.length !== 4} className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60" onClick={submitUnlock}>
									Unlock vault
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</section>
	);
}
