"use client";

import { useState } from "react";
import AlbumFormModal from "@/components/album-form-modal";

export default function NewAlbumForm() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black" onClick={() => setOpen(true)}>
				New album
			</button>
			{open && <AlbumFormModal mode="create" onClose={() => setOpen(false)} />}
		</>
	);
}
