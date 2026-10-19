"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAlbumAction } from "@/lib/actions";
import { IconDotsVertical, IconPencil, IconTrash } from "@tabler/icons-react";
import Icon from "@/components/icon";
import AlbumFormModal from "@/components/album-form-modal";

const styles = {
	card: {
		wrapper: "absolute right-2 top-2",
		button: "grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/60",
		panel: "absolute right-0 top-9 z-20 w-44 rounded-xl border border-white/15 bg-zinc-900 p-1 text-xs text-white shadow-2xl",
		item: "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-white/10",
		danger: "",
		note: "text-white/40",
		error: "text-[#f2a6a6]",
		cancel: "text-white/70",
	},
	page: {
		wrapper: "relative",
		button: "grid h-10 w-10 place-items-center rounded-full border border-line bg-panel text-ink transition hover:bg-black/5",
		panel: "absolute right-0 top-12 z-20 w-48 rounded-xl border border-line bg-panel p-1.5 shadow-xl",
		item: "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-black/5",
		danger: "text-[#c5221f]",
		note: "text-faint",
		error: "text-[#c5221f]",
		cancel: "text-ink",
	},
};

export default function AlbumMenu({ album, variant = "card", deletedHref = "/albums" }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState("main");
	const [renameOpen, setRenameOpen] = useState(false);
	const [error, setError] = useState(null);
	const menuRef = useRef(null);
	const token = styles[variant];

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event) => {
			if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
		};
		const onKeyDown = (event) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	const remove = async () => {
		const result = await deleteAlbumAction(album.id);
		if (result.error) {
			setError(result.error);
			return;
		}
		if (deletedHref) router.push(deletedHref);
		router.refresh();
	};

	return (
		<div className={token.wrapper} ref={menuRef}>
			<button className={token.button} onClick={() => { setOpen(!open); setMode("main"); setError(null); }} aria-label="Album options" aria-expanded={open}>
				<Icon icon={IconDotsVertical} size={variant === "card" ? 14 : 18} />
			</button>
			{open && (
				<div className={token.panel}>
					<button className={token.item} onClick={() => { setOpen(false); setRenameOpen(true); }}>
						<Icon icon={IconPencil} size={15} /> Rename
					</button>
					<button className={`${token.item} ${token.danger}`} onClick={() => setMode("delete")}>
						<Icon icon={IconTrash} size={15} /> Delete album
					</button>
					{mode === "delete" && (
						<div className="p-2">
							<p className="text-sm font-medium">Delete this album?</p>
							<p className={`mt-0.5 text-[11px] ${token.note}`}>Photos stay in your library.</p>
							<div className="mt-2 flex justify-end gap-2">
								<button type="button" className={`rounded-full px-3 py-1.5 text-xs font-medium transition hover:bg-black/10 ${token.cancel}`} onClick={() => setMode("main")}>
									Cancel
								</button>
								<button type="button" className="rounded-full bg-[#c5221f] px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110" onClick={remove}>
									Delete
								</button>
							</div>
						</div>
					)}
					{error && <p className={`px-2.5 pb-1.5 pt-1 text-[11px] ${token.error}`}>{error}</p>}
				</div>
			)}
			{renameOpen && <AlbumFormModal mode="rename" album={album} onClose={() => setRenameOpen(false)} />}
		</div>
	);
}
