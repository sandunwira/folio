"use client";

import { useState } from "react";
import AlbumFormModal from "@/components/album-form-modal";
import { IconPlus } from '@tabler/icons-react';

export default function NewAlbumForm() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button className="flex flex-row items-center gap-2 h-10 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black" onClick={() => setOpen(true)}>
				<IconPlus stroke={2} size={16} /> Create
			</button>
			{open && <AlbumFormModal mode="create" onClose={() => setOpen(false)} />}
		</>
	);
}
