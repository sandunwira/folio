"use client";

import { useEffect, useMemo, useState } from "react";
import {
	IconAlbum,
	IconArchive,
	IconArrowRight,
	IconBell,
	IconHome,
	IconHeart,
	IconPhotoPlus,
	IconPlayerPlay,
	IconPlus,
	IconSearch,
	IconSettings,
	IconPhotoVideo,
	IconUpload,
	IconX,
} from "@tabler/icons-react";

const photos = [
	{ id: 1, title: "Salt air", date: "Today", location: "Cape Kiwanda", type: "photo", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85" },
	{ id: 2, title: "Quiet morning", date: "Today", location: "Cannon Beach", type: "photo", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85" },
	{ id: 3, title: "Tide lines", date: "Today", location: "Cape Kiwanda", type: "video", image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85" },
	{ id: 4, title: "Pacific hush", date: "Yesterday", location: "Manzanita", type: "photo", image: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=900&q=85" },
	{ id: 5, title: "Low tide", date: "Yesterday", location: "Neskowin", type: "photo", image: "https://images.unsplash.com/photo-1502680390469-be75c86b6367?auto=format&fit=crop&w=900&q=85" },
	{ id: 6, title: "Blue hour", date: "Yesterday", location: "Pacific City", type: "photo", image: "https://images.unsplash.com/photo-1493552152660-f915ab47ae9d?auto=format&fit=crop&w=900&q=85" },
	{ id: 7, title: "New growth", date: "May 14, 2024", location: "Portland", type: "photo", image: "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=85" },
	{ id: 8, title: "Golden field", date: "May 14, 2024", location: "Willamette Valley", type: "photo", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=85" },
	{ id: 9, title: "Sun on water", date: "May 12, 2024", location: "Oregon Coast", type: "photo", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85" },
];

const navItems = [["Library", IconHome], ["Albums", IconAlbum], ["Favorites", IconHeart], ["Archive", IconArchive]];

function Icon({ icon: IconComponent, className = "" }) {
	return <IconComponent className={className} size={18} stroke={1.8} aria-hidden="true" />;
}

export default function Home() {
	const [activeNav, setActiveNav] = useState("Library");
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState(null);
	const [showUpload, setShowUpload] = useState(false);

	useEffect(() => {
		if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
	}, []);

	const filteredPhotos = useMemo(() => photos.filter((photo) => {
		const matchesQuery = `${photo.title} ${photo.location}`.toLowerCase().includes(query.toLowerCase());
		const matchesNav = activeNav === "Favorites" ? [1, 5, 8].includes(photo.id) : activeNav === "Archive" ? photo.id === 7 : true;
		return matchesQuery && matchesNav;
	}), [activeNav, query]);

	return (
		<div className="min-h-screen bg-[#f2f0eb] text-[#222321]">
			<aside className="fixed inset-x-0 bottom-0 z-30 flex h-17 items-center justify-around border-t border-[#dcd9d1] bg-[#f8f7f3] px-2 md:inset-y-0 md:right-auto md:h-screen md:w-56 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-5 md:py-7">
				<div className="mb-16 hidden items-center gap-3 md:flex"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#222321] text-sm text-white"><Icon icon={IconPhotoVideo} /></span><span className="text-lg font-semibold tracking-[-.5px]">folio</span></div>
				<button className="mb-10 hidden h-11 items-center justify-center gap-2 rounded-full border-0 bg-[#222321] px-4 text-xs font-semibold text-white transition hover:bg-black md:flex" onClick={() => setShowUpload(true)}><Icon icon={IconPlus} /> Add memories</button>
				<nav className="flex w-full justify-around gap-1 md:flex-col md:justify-start md:gap-1" aria-label="Main navigation">
					{navItems.map(([label, IconComponent]) => <button key={label} className={`group flex min-w-15.5 flex-col items-center gap-1 rounded-xl border-0 px-2 py-2.5 text-[10px] text-[#8a8983] transition hover:text-[#222321] md:min-w-0 md:flex-row md:gap-3 md:px-3 md:py-3 md:text-xs ${activeNav === label ? "bg-[#e5e2db] font-semibold text-[#222321]" : "bg-transparent"}`} onClick={() => setActiveNav(label)}><Icon icon={IconComponent} /><span>{label}</span>{label === "Albums" && <span className="hidden md:ml-auto md:inline">12</span>}</button>)}
				</nav>
				<div className="mt-auto hidden border-t border-[#dcd9d1] pt-6 md:block"><p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[1.5px] text-[#aaa79f]">Collections</p><button className="flex w-full items-center gap-3 border-0 bg-transparent px-3 py-2 text-left text-xs text-[#696862] hover:text-[#222321]"><span className="h-2 w-2 rounded-full bg-[#d96b55]" />Weekend escapes</button><button className="flex w-full items-center gap-3 border-0 bg-transparent px-3 py-2 text-left text-xs text-[#696862] hover:text-[#222321]"><span className="h-2 w-2 rounded-full bg-[#d2a835]" />Family archive</button><button className="flex w-full items-center gap-3 border-0 bg-transparent px-3 py-2 text-left text-xs text-[#696862] hover:text-[#222321]"><span className="h-2 w-2 rounded-full bg-[#629c91]" />Inspiration</button></div>
				<div className="mt-8 hidden items-center gap-3 border-t border-[#dcd9d1] px-2 pt-5 md:flex"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#d8d4ca] text-[10px] font-bold">AM</div><div className="min-w-0"><p className="truncate text-xs font-semibold">Alex Morgan</p><p className="text-[10px] text-[#aaa79f]">Personal space</p></div></div>
			</aside>

			<main className="pb-24 md:ml-56 md:pb-0">
				<header className="flex h-18 items-center justify-between border-b border-[#dcd9d1] bg-[#f8f7f3] px-5 md:px-12"><div className="flex items-center gap-2 text-xs text-[#a09e96] md:hidden"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#222321] text-[10px] text-white"><Icon icon={IconPhotoVideo} /></span>folio</div><div className="hidden items-center gap-2 text-xs text-[#aaa79f] md:flex"><span>Library</span><span>/</span><strong className="text-[#222321]">{activeNav}</strong></div><div className="flex items-center gap-3 md:gap-5"><label className="flex h-9 w-9 items-center overflow-hidden rounded-full border border-[#dcd9d1] bg-white px-2 text-[#77756f] transition focus-within:w-52 md:w-52 md:rounded-lg"><Icon icon={IconSearch} /><input className="w-full border-0 bg-transparent px-2 text-xs text-[#222321] outline-none placeholder:text-[#aaa79f]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search archive" /></label><button className="border-0 bg-transparent text-lg text-[#77756f]" aria-label="Notifications"><Icon icon={IconBell} /></button><button className="border-0 bg-transparent text-lg text-[#77756f]" aria-label="Settings"><Icon icon={IconSettings} /></button></div></header>

				<section className="mx-auto max-w-330 px-5 py-8 md:px-12 md:py-14">
					<div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[2px] text-[#aaa79f]">Personal archive</p><h1 className="text-4xl font-semibold tracking-[-2px] md:text-6xl">{activeNav === "Library" ? "Your memories" : activeNav}</h1><p className="mt-4 max-w-md text-sm leading-6 text-[#77756f]">A quiet place for the moments worth keeping. <span className="text-[#aaa79f]">{filteredPhotos.length * 143} items</span></p></div><button className="flex w-fit items-center gap-2 rounded-full border border-[#cfcac0] bg-transparent px-4 py-2.5 text-xs font-semibold text-[#55544f] transition hover:border-[#222321] hover:bg-white" onClick={() => setShowUpload(true)}><Icon icon={IconPlus} /> Add to archive</button></div>
					<div className="mb-14 grid overflow-hidden rounded-2xl bg-[#252724] text-white md:grid-cols-[1.05fr_.95fr]"><div className="flex min-h-70 flex-col justify-between p-7 md:min-h-90 md:p-10"><div><span className="text-[10px] font-semibold uppercase tracking-[1.7px] text-[#aaa79f]">A memory from the coast</span><h2 className="mt-5 max-w-md text-3xl font-medium leading-tight tracking-[-1.2px] md:text-5xl">Somewhere between here and the horizon.</h2></div><button className="flex w-fit items-center gap-5 border-0 border-b border-[#777870] bg-transparent pb-2 text-xs font-semibold text-white" onClick={() => setSelected(photos[0])}>Open memory <Icon icon={IconArrowRight} /></button></div><button className="relative min-h-55 overflow-hidden border-0 bg-[#4f655d] text-left md:min-h-0" onClick={() => setSelected(photos[0])}><div className="absolute inset-0 bg-cover bg-center transition duration-700 hover:scale-105" style={{ backgroundImage: `url(${photos[0].image})` }} /><span className="absolute bottom-5 left-5 rounded-full bg-black/50 px-3 py-1.5 text-[10px] text-white">Cape Kiwanda · Today</span></button></div>
					<div className="mb-5 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[1.7px] text-[#aaa79f]">Recently added</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.8px]">All media</h2></div><div className="flex items-center gap-1 rounded-full border border-[#dcd9d1] bg-[#f8f7f3] p-1"><button className="rounded-full bg-[#222321] px-3 py-1.5 text-[10px] font-semibold text-white">Photos</button><button className="rounded-full px-3 py-1.5 text-[10px] text-[#898780]">Videos</button></div></div>
					<div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{filteredPhotos.slice(1).map((photo) => <button key={photo.id} className="group relative aspect-4/3 overflow-hidden rounded-xl border-0 bg-[#ddd9d0] text-left md:aspect-[1.18]" onClick={() => setSelected(photo)}><div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${photo.image})` }} /><div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/60 to-transparent" /><div className="absolute inset-x-3 bottom-3 flex items-end justify-between text-white"><span className="text-[10px] font-medium">{photo.title}</span>{photo.type === "video" && <span className="flex items-center gap-1 rounded-full bg-[#d96b55] px-2 py-1 text-[9px] font-semibold"><Icon icon={IconPlayerPlay} /> VIDEO</span>}</div></button>)}</div>
					{filteredPhotos.length === 0 && <div className="py-24 text-center"><Icon icon={IconSearch} className="mx-auto" /><h2 className="mt-4 text-xl font-semibold">Nothing here yet</h2><p className="mt-2 text-sm text-[#77756f]">Try another search.</p></div>}
				</section>
			</main>

			{selected && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-5" role="dialog" aria-modal="true" onClick={() => setSelected(null)}><button className="absolute right-6 top-5 border-0 bg-transparent text-3xl font-light text-white" onClick={() => setSelected(null)} aria-label="Close preview"><Icon icon={IconX} /></button><div className="h-[72vh] w-[94vw] bg-contain bg-center bg-no-repeat md:w-[78vw]" style={{ backgroundImage: `url(${selected.image})` }} onClick={(event) => event.stopPropagation()} /><div className="absolute bottom-6 left-6 text-white"><strong className="text-sm">{selected.title}</strong><p className="mt-1 text-xs text-white/60">{selected.location} · {selected.date}</p></div></div>}
			{showUpload && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5" onClick={() => setShowUpload(false)}><div className="relative w-full max-w-md rounded-2xl bg-[#f8f7f3] p-8 text-center" onClick={(event) => event.stopPropagation()}><button className="absolute right-5 top-4 border-0 bg-transparent text-2xl text-[#77756f]" onClick={() => setShowUpload(false)} aria-label="Close upload dialog"><Icon icon={IconX} /></button><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#222321] text-xl text-white"><Icon icon={IconPhotoPlus} /></div><h2 className="mt-5 text-2xl font-semibold tracking-[-.6px]">Add to your archive</h2><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#77756f]">Choose photos or videos from your device to keep them close.</p><button className="mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-full border-0 bg-[#222321] text-xs font-semibold text-white" onClick={() => setShowUpload(false)}><Icon icon={IconUpload} /> Choose files</button><p className="mt-4 text-[10px] text-[#aaa79f]">JPG, PNG, HEIC, MOV, MP4</p></div></div>}
		</div>
	);
}