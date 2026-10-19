"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAlbumAction } from "@/lib/actions";

export default function NewAlbumForm() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [error, setError] = useState(null);
	const [busy, setBusy] = useState(false);

	const submit = async (event) => {
		event.preventDefault();
		const value = name.trim();
		if (!value || busy) return;
		setBusy(true);
		setError(null);
		const formData = new FormData();
		formData.set("name", value);
		const result = await createAlbumAction(formData);
		setBusy(false);
		if (result.error) {
			setError(result.error);
			return;
		}
		setName("");
		setOpen(false);
		router.refresh();
	};

	return (
		<>
			<button className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black" onClick={() => setOpen(true)}>
				New album
			</button>
			{open && (
				<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5" onClick={() => setOpen(false)}>
					<form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-line bg-panel p-6" onClick={(event) => event.stopPropagation()}>
						<h2 className="text-lg font-medium">Create album</h2>
						<p className="mt-1 text-xs text-muted">Group any photos or videos into a collection.</p>
						{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
						<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="Album name" aria-label="Album name" className="mt-4 h-10 w-full rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-faint focus:border-ink" />
						<div className="mt-5 flex justify-end gap-3">
							<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={() => setOpen(false)}>
								Cancel
							</button>
							<button type="submit" disabled={busy || !name.trim()} className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-40">
								Create
							</button>
						</div>
					</form>
				</div>
			)}
		</>
	);
}
