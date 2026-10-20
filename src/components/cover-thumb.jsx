"use client";

import { useState } from "react";
import { IconPhotoOff } from "@tabler/icons-react";
import Icon from "@/components/icon";

export default function CoverThumb({ src, alt }) {
	const [failed, setFailed] = useState(false);

	if (failed) {
		return (
			<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#ececec] text-muted">
				<Icon icon={IconPhotoOff} size={24} />
				<span className="text-[10px] text-faint">No preview</span>
			</div>
		);
	}
	return <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={() => setFailed(true)} />;
}
