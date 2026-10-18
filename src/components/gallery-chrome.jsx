"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	IconAlbum,
	IconArchive,
	IconCloudUpload,
	IconHeart,
	IconLock,
	IconMap,
	IconMenu2,
	IconPhoto,
	IconSearch,
	IconTrash,
	IconUsers,
	IconWand,
	IconX,
} from "@tabler/icons-react";

function Icon({ icon: IconComponent, className = "", size = 20 }) {
	return <IconComponent className={className} size={size} stroke={1.8} aria-hidden="true" />;
}

const navItems = [
	{ href: "/", label: "Media", icon: IconPhoto },
	{ href: "/places", label: "Places", icon: IconMap },
	{ href: "/people", label: "People", icon: IconUsers },
	{ href: "/favorites", label: "Favorites", icon: IconHeart },
	{ href: "/albums", label: "Albums", icon: IconAlbum },
	{ href: "/utilities", label: "Utilities", icon: IconWand },
	{ href: "/archive", label: "Archive", icon: IconArchive },
	{ href: "/vault", label: "Vault", icon: IconLock },
	{ href: "/trash", label: "Trash", icon: IconTrash },
];

const routeTitles = Object.fromEntries(navItems.map((item) => [item.href, item.label]));

function SearchField() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const current = searchParams.get("q") ?? "";
	const [value, setValue] = useState(current);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (value === current) return;
			router.replace(value ? `${pathname}?q=${encodeURIComponent(value)}` : pathname, { scroll: false });
		}, 250);
		return () => clearTimeout(timer);
	}, [value, current, pathname, router]);

	return (
		<label className="mx-2 my-1 mt-5 flex h-12 items-center gap-3 rounded-full bg-[#f0f0f0] px-4 text-muted transition hover:bg-[#ebebeb] focus-within:bg-white focus-within:shadow-md">
			<Icon icon={IconSearch} className="shrink-0" />
			<input className="w-full border-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Search your photos" />
			{value && (
				<button onClick={() => setValue("")} aria-label="Clear search" className="shrink-0">
					<Icon icon={IconX} size={16} />
				</button>
			)}
		</label>
	);
}

export default function GalleryChrome({ brand, storage }) {
	const pathname = usePathname();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [showUpload, setShowUpload] = useState(false);
	const activeTitle = routeTitles[pathname] ?? "Media";

	useEffect(() => {
		if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
	}, []);

	return (
		<>
			<aside className={`fixed inset-y-0 left-0 z-50 flex w-75 max-w-[85vw] flex-col bg-panel px-3 py-4 shadow-2xl transition-transform duration-300 md:z-30 md:w-64 md:translate-x-0 md:shadow-none ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
				<Link href="/" className="flex items-center gap-3 px-4 py-2 md:px-6 rounded-full font-medium text-ink hover:bg-black/5" onClick={() => setDrawerOpen(false)}>
					<span className="md:hidden">
						<Icon icon={IconMenu2} />
					</span>
					<img src="/icon.png" alt="Logo" width={24} height={24} className="text-[#1F5194]" />
					<span className="truncate text-sm font-semibold tracking-tight text-ink">{brand}</span>
				</Link>
				<SearchField key={pathname} />
				<nav className="mt-5 flex flex-col gap-1 overflow-y-auto px-2 pb-1 scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-track]:bg-transparent md:px-4">
					{navItems.map((item) => (
						<Link key={item.label} href={item.href} onClick={() => setDrawerOpen(false)} className={`flex shrink-0 items-center gap-4 rounded-full px-4 py-2.5 text-sm transition md:px-6 ${pathname === item.href ? "bg-accent-soft font-medium text-ink" : "text-ink hover:bg-black/5"}`}>
							<Icon icon={item.icon} />
							{item.label}
						</Link>
					))}
				</nav>
				<div className="mt-auto hidden border-t border-line px-2 pb-2 pt-3 md:block md:px-4">
					<div className="rounded-2xl border border-line bg-panel p-4">
						<p className="text-xs font-medium text-ink">Storage used</p>
						<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ececec]">
							<div className="h-full rounded-full bg-ink" style={{ width: `${storage.percent}%` }} />
						</div>
						<p className="mt-2 text-[11px] text-muted">{storage.usedGb} GB of {storage.quotaGb} GB used</p>
					</div>
				</div>
			</aside>
			{drawerOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setDrawerOpen(false)} />}

			<header className="sticky top-0 z-20 flex h-16 items-center gap-2 bg-surface px-4 md:hidden">
				<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
					<Icon icon={IconMenu2} />
				</button>
				<span className="text-[17px] font-medium">{activeTitle}</span>
				<div className="ml-auto flex items-center gap-1">
					<button onClick={() => setShowUpload(true)} aria-label="Upload" className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5">
						<Icon icon={IconCloudUpload} />
					</button>
				</div>
			</header>

			<button className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-2xl bg-ink text-white shadow-lg transition hover:bg-black hover:shadow-xl md:rounded-full" onClick={() => setShowUpload(true)} aria-label="Add photos">
				<Icon icon={IconCloudUpload} size={24} />
			</button>

			{showUpload && (
				<div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5" onClick={() => setShowUpload(false)}>
					<div className="relative w-full max-w-md rounded-3xl bg-panel p-8 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
						<button className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-black/5" onClick={() => setShowUpload(false)} aria-label="Close upload dialog">
							<Icon icon={IconX} />
						</button>
						<div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-black/5 text-ink">
							<Icon icon={IconCloudUpload} size={26} />
						</div>
						<h2 className="mt-5 text-xl font-medium">Upload to your archive</h2>
						<p className="mx-auto mt-2 max-w-xs text-sm text-muted">Add photos and videos from your device. They will be backed up automatically.</p>
						<button className="mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-medium text-white transition hover:bg-black" onClick={() => setShowUpload(false)}>
							<Icon icon={IconCloudUpload} size={18} /> Select from computer
						</button>
						<p className="mt-4 text-[11px] text-faint">JPG, PNG, HEIC, MOV, MP4</p>
					</div>
				</div>
			)}
		</>
	);
}
