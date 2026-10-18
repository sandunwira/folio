"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { IconLayoutDashboard, IconPower, IconSettings } from "@tabler/icons-react";

function Icon({ icon: IconComponent, className = "", size = 20 }) {
	return <IconComponent className={className} size={size} stroke={1.8} aria-hidden="true" />;
}

export default function UserMenu({ user, className = "" }) {
	const [open, setOpen] = useState(false);
	const menuRef = useRef(null);

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

	const itemClass = "flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink transition hover:bg-black/5";

	return (
		<div className={`relative ${className}`} ref={menuRef}>
			<button onClick={() => setOpen((value) => !value)} className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-medium text-white" aria-label="Account menu" aria-expanded={open}>
				{(user.name?.[0] ?? "?").toUpperCase()}
			</button>
			{open && (
				<div className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-panel py-1.5 shadow-xl">
					<div className="mb-1 border-b border-line px-4 pb-3 pt-2">
						<p className="truncate text-sm font-medium text-ink">{user.name}</p>
						<p className="truncate text-xs text-muted">@{user.username}{user.isAdmin ? " · Admin" : ""}</p>
					</div>
					<nav className="flex flex-col">
						{user.isAdmin && (
							<Link href="/dashboard" className={itemClass} onClick={() => setOpen(false)}>
								<Icon icon={IconLayoutDashboard} size={16} /> Dashboard
							</Link>
						)}
						<Link href="/settings" className={itemClass} onClick={() => setOpen(false)}>
							<Icon icon={IconSettings} size={16} /> Settings
						</Link>
					</nav>
					<div className="mt-1 border-t border-line pt-1">
						<form action={logoutAction}>
							<button className={itemClass}>
								<Icon icon={IconPower} size={16} /> Log out
							</button>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
