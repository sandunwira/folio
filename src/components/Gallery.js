"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import {
	IconAlbum,
	IconArchive,
	IconCheck,
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight,
	IconCloudUpload,
	IconHeart,
	IconInfoCircle,
	IconLayoutDashboard,
	IconLock,
	IconMap,
	IconMenu2,
	IconPhoto,
	IconPlayerPlay,
	IconSearch,
	IconSettings,
	IconShare,
	IconTrash,
	IconUsers,
	IconWand,
	IconPower,
	IconX,
} from "@tabler/icons-react";

const photosData = [
	{ id: 1, title: "Salt air", date: "Today", time: "4:03 PM", location: "Cape Kiwanda", type: "photo", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80" },
	{ id: 2, title: "Quiet morning", date: "Today", time: "9:47 AM", location: "Cannon Beach", type: "photo", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
	{ id: 3, title: "Tide lines", date: "Today", time: "10:12 AM", location: "Cape Kiwanda", type: "video", image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=80" },
	{ id: 4, title: "Pacific hush", date: "Yesterday", time: "7:30 PM", location: "Manzanita", type: "photo", image: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=800&q=80" },
	{ id: 5, title: "Low tide", date: "Yesterday", time: "6:15 PM", location: "Neskowin", type: "photo", image: "https://images.unsplash.com/photo-1502680390469-be75c86b6364?auto=format&fit=crop&w=800&q=80" },
	{ id: 6, title: "Blue hour", date: "Yesterday", time: "5:58 PM", location: "Pacific City", type: "photo", image: "https://images.unsplash.com/photo-1493552152660-f915ab47ae9d?auto=format&fit=crop&w=800&q=80" },
	{ id: 7, title: "Shorebreak", date: "Yesterday", time: "2:21 PM", location: "Cannon Beach", type: "photo", image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" },
	{ id: 8, title: "Golden field", date: "Oct 3, 2026", time: "5:40 PM", location: "Willamette Valley", type: "photo", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80" },
	{ id: 9, title: "Trailhead", date: "Oct 3, 2026", time: "8:05 AM", location: "Mount Hood", type: "photo", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80" },
	{ id: 10, title: "Alpine lake", date: "Oct 3, 2026", time: "11:32 AM", location: "Mount Hood", type: "photo", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80" },
	{ id: 11, title: "Fog line", date: "Oct 3, 2026", time: "9:12 AM", location: "Mount Hood", type: "photo", image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" },
	{ id: 12, title: "New growth", date: "Sep 18, 2026", time: "3:44 PM", location: "Portland", type: "photo", image: "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=800&q=80" },
	{ id: 13, title: "Forest path", date: "Sep 18, 2026", time: "2:50 PM", location: "Portland", type: "photo", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80" },
	{ id: 14, title: "Sea stack", date: "Sep 18, 2026", time: "12:08 PM", location: "Bandon", type: "photo", image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80" },
	{ id: 15, title: "Night sky", date: "Sep 2, 2026", time: "10:26 PM", location: "Willamette Valley", type: "photo", image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80" },
];

const favorites = new Set([1, 5, 11]);
const archivedIds = new Set([12, 14]);

const albums = [
	{ name: "Weekend escapes", count: 42, cover: photosData[0].image },
	{ name: "Family archive", count: 128, cover: photosData[3].image },
	{ name: "Inspiration", count: 67, cover: photosData[10].image },
	{ name: "Coast line", count: 91, cover: photosData[6].image },
];

const mainNav = [
	["Media", IconPhoto],
	["Places", IconMap],
	["People", IconUsers],
];

const libraryNav = [
	["Favorites", IconHeart],
	["Albums", IconAlbum],
];

const folderNav = [
	["Utilities", IconWand],
	["Archive", IconArchive],
	["Vault", IconLock],
	["Trash", IconTrash],
];

const photoNavs = ["Media", "People", "Favorites", "Archive"];

const emptyStates = {
	Utilities: { icon: IconWand, title: "Nothing to do here yet", text: "Utilities like free up space, collages and animations will be available here." },
	"Vault": { icon: IconLock, title: "No items in your vault", text: "Items you move here stay hidden from your grid, search and memories until you unlock them." },
	Trash: { icon: IconTrash, title: "No items in Trash", text: "Deleted photos and videos are kept here for 60 days before being removed forever." },
};

function PinwheelLogo({ size = 24 }) {
	return (
		<img src="/icon.png" alt="Logo" width={size} height={size} className="text-[#1F5194]" />
	);
}

function Icon({ icon: IconComponent, className = "", size = 20 }) {
	return <IconComponent className={className} size={size} stroke={1.8} aria-hidden="true" />;
}

function UserMenu({ user, className = "" }) {
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

function SidebarContent({ user, brand, storage, activeNav, query, setQuery, onNavigate }) {
	return (
		<>
			<button className="flex items-center gap-4 rounded-full px-4 py-2.5 text-[17px] font-medium text-ink hover:bg-black/5 md:px-6" onClick={() => onNavigate("Media")}>
				<span className="md:hidden"><Icon icon={IconMenu2} /></span>
				<PinwheelLogo />
				<span className="truncate text-sm font-semibold tracking-tight text-ink">{brand}</span>
			</button>
			<label className="mx-2 my-1 mt-3 flex h-12 items-center gap-3 rounded-full bg-[#f0f0f0] px-4 text-muted transition hover:bg-[#ebebeb] focus-within:bg-white focus-within:shadow-md">
				<Icon icon={IconSearch} className="shrink-0" />
				<input className="w-full border-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your photos" />
			</label>
			<div className="mt-5 flex flex-col gap-1 overflow-y-auto px-2 pb-1 scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-track]:bg-transparent md:px-4">
				{[...mainNav, ...libraryNav, ...folderNav].map(([label, IconComponent]) => (
					<button key={label} className={`flex shrink-0 items-center gap-4 rounded-full px-4 py-2.5 text-sm transition md:px-6 ${activeNav === label ? "bg-accent-soft font-medium text-ink" : "text-ink hover:bg-black/5"}`} onClick={() => onNavigate(label)}>
						<Icon icon={IconComponent} />
						{label}
					</button>
				))}
			</div>
			<div className="mt-auto hidden border-t border-line px-2 pb-2 pt-3 md:block md:px-4">
				<div className="rounded-2xl border border-line bg-panel p-4">
					<p className="text-xs font-medium text-ink">Storage used</p>
					<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ececec]"><div className="h-full rounded-full bg-ink" style={{ width: `${storage.percent}%` }} /></div>
					<p className="mt-2 text-[11px] text-muted">{storage.usedGb} GB of {storage.quotaGb} GB used</p>
				</div>
				<div className="mt-2 flex items-center gap-3 px-2 pb-2 pt-3 md:px-4">
					<span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-medium text-white">{(user.name?.[0] ?? "?").toUpperCase()}</span>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium text-ink">{user.name}</p>
						<p className="truncate text-xs text-muted">@{user.username}</p>
					</div>
					<form action={logoutAction}>
						<button className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-black/5 hover:text-ink" aria-label="Log out">
							<Icon icon={IconPower} size={16} />
						</button>
					</form>
				</div>
			</div>
		</>
	);
}

export default function Gallery({ user, settings = {} }) {
	const brandName = settings.appName ?? "folio";
	const quotaGb = settings.quotaGb ?? 15;
	const usedGb = settings.usedGb ?? 5.7;
	const storagePercent = quotaGb > 0 ? Math.min(100, (usedGb / quotaGb) * 100) : 0;
	const [activeNav, setActiveNav] = useState("Media");
	const [query, setQuery] = useState("");
	const [viewerIndex, setViewerIndex] = useState(null);
	const [showUpload, setShowUpload] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [selection, setSelection] = useState(new Set());

	useEffect(() => {
		if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
	}, []);

	const navigate = (label) => {
		setActiveNav(label);
		setSelection(new Set());
		setDrawerOpen(false);
	};

	const toggleSelect = (id) => {
		const next = new Set(selection);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setSelection(next);
	};

	const filteredPhotos = photosData.filter((photo) => {
		const matchesQuery = `${photo.title} ${photo.location}`.toLowerCase().includes(query.toLowerCase());
		const matchesNav = photoNavs.includes(activeNav) ? activeNav === "Favorites" ? favorites.has(photo.id) : activeNav === "Archive" ? archivedIds.has(photo.id) : !archivedIds.has(photo.id) : false;
		return matchesQuery && matchesNav;
	});

	const places = photosData.reduce((placeList, photo) => {
		const existing = placeList.find((place) => place.name === photo.location);
		if (existing) existing.count += 1;
		else placeList.push({ name: photo.location, cover: photo.image, count: 1 });
		return placeList;
	}, []);

	const sections = filteredPhotos.reduce((groups, photo) => {
		const last = groups[groups.length - 1];
		if (last && last.date === photo.date) last.photos.push(photo);
		else groups.push({ date: photo.date, photos: [photo] });
		return groups;
	}, []);

	const viewerPhoto = viewerIndex !== null ? filteredPhotos[viewerIndex] : null;
	const pageTitle = activeNav;
	const viewerImage = viewerPhoto ? viewerPhoto.image.replace("w=800", "w=1400") : "";

	useEffect(() => {
		if (viewerIndex === null) return;
		const onKey = (event) => {
			if (event.key === "Escape") setViewerIndex(null);
			if (event.key === "ArrowRight" && viewerIndex < filteredPhotos.length - 1) setViewerIndex(viewerIndex + 1);
			if (event.key === "ArrowLeft" && viewerIndex > 0) setViewerIndex(viewerIndex - 1);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [viewerIndex, filteredPhotos]);

	return (
		<div className="min-h-screen bg-surface text-ink">
			<aside className={`fixed inset-y-0 left-0 z-50 flex w-75 max-w-[85vw] flex-col bg-panel px-3 py-4 shadow-2xl transition-transform duration-300 md:z-30 md:w-64 md:translate-x-0 md:shadow-none ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
				<SidebarContent user={user} brand={brandName} storage={{ usedGb, quotaGb, percent: storagePercent }} activeNav={activeNav} setActiveNav={setActiveNav} query={query} setQuery={setQuery} onNavigate={navigate} />
			</aside>
			{drawerOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setDrawerOpen(false)} />}

			<main className="md:ml-64">
				<header className="sticky top-0 z-20 flex h-16 items-center gap-2 bg-surface px-4 md:hidden">
					<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
						<Icon icon={IconMenu2} />
					</button>
					<span className="text-[17px] font-medium">{activeNav}</span>
					<div className="ml-auto flex items-center gap-1">
						<button onClick={() => setShowUpload(true)} aria-label="Upload" className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5"><Icon icon={IconCloudUpload} /></button>
						<UserMenu user={user} className="mr-1" />
					</div>
				</header>

				{selection.size > 0 && (
					<div className="sticky top-0 z-20 flex h-14 items-center gap-4 bg-ink px-4 text-white md:px-8">
						<button onClick={() => setSelection(new Set())} aria-label="Clear selection"><Icon icon={IconX} /></button>
						<span className="text-sm font-medium">{selection.size} selected</span>
						<div className="ml-auto flex items-center gap-1">
							<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" aria-label="Add to favorites"><Icon icon={IconHeart} /></button>
							<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" aria-label="Share"><Icon icon={IconShare} /></button>
							<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" aria-label="Delete"><Icon icon={IconTrash} /></button>
						</div>
					</div>
				)}

				<section className="mx-auto max-w-360 px-3 pb-32 pt-4 sm:px-5 md:px-8 md:pt-6">
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<h1 className="hidden text-[22px] font-medium md:block">{pageTitle}</h1>
						<p className="text-xs text-muted md:hidden">{filteredPhotos.length} items</p>
						<UserMenu user={user} className="shrink-0" />
					</div>

					{activeNav === "Places" ? (
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
							{places.map((place) => (
								<button key={place.name} className="group text-left" onClick={() => navigate("Media")}>
									<div className="relative aspect-square overflow-hidden rounded-xl bg-[#ececec]">
										<img src={place.cover} alt={place.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
									</div>
									<p className="mt-2.5 truncate text-sm font-medium">{place.name}</p>
									<p className="text-xs text-muted">{place.count} items</p>
								</button>
							))}
						</div>
					) : activeNav === "Albums" ? (
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
							{albums.map((album) => (
								<button key={album.name} className="group text-left" onClick={() => navigate("Media")}>
									<div className="relative aspect-square overflow-hidden rounded-xl bg-[#ececec]">
										<img src={album.cover} alt={album.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
									</div>
									<p className="mt-2.5 truncate text-sm font-medium">{album.name}</p>
									<p className="text-xs text-muted">{album.count} items</p>
								</button>
							))}
						</div>
					) : (
						<>
							{sections.map((section) => (
								<div key={section.date} className="mb-6">
									<div className="sticky top-16 z-10 mb-2 flex items-center gap-2 bg-surface py-2 md:top-1">
										<h2 className="text-[15px] font-medium">{section.date}</h2>
										<span className="text-xs text-muted">· {section.photos.length} items</span>
										<button className="ml-1 grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-black/5" aria-label="Collapse section"><Icon icon={IconChevronDown} size={16} /></button>
									</div>
									<div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
										{section.photos.map((photo) => {
											const globalIndex = filteredPhotos.indexOf(photo);
											const isSelected = selection.has(photo.id);
											return (
												<button key={photo.id} className={`group relative aspect-square overflow-hidden bg-[#ececec] outline-none transition focus-visible:ring-2 focus-visible:ring-ink ${isSelected ? "rounded-md ring-2 ring-inset ring-ink" : "rounded-lg"}`} onClick={() => (isSelected ? toggleSelect(photo.id) : setViewerIndex(globalIndex))}>
													<img src={photo.image} alt={photo.title} loading="lazy" className="h-full w-full object-cover" />
													{photo.type === "video" && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/40 text-white"><Icon icon={IconPlayerPlay} size={12} /></span>}
													<span className={`absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 transition ${isSelected ? "border-white bg-ink text-white opacity-100" : "border-white bg-black/20 text-transparent opacity-0 group-hover:opacity-100"}`} onClick={(event) => { event.stopPropagation(); toggleSelect(photo.id); }} aria-label="Select photo">
														<Icon icon={IconCheck} size={14} />
													</span>
													<span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/50 to-transparent p-2 pt-6 text-left opacity-100 transition group-hover:opacity-100"><span className="line-clamp-1 text-[11px] text-white">{photo.title}</span></span>
													<span className="pointer-events-none absolute inset-0 hidden rounded-lg group-hover:block group-hover:bg-black/10" />
												</button>
											);
										})}
									</div>
								</div>
							))}
							{sections.length === 0 && (() => {
								const info = emptyStates[activeNav] ?? (query ? { icon: IconSearch, title: "No results found", text: `No matches for "${query}". Try a different search.` } : { icon: IconPhoto, title: "No photos here", text: "Add some memories to get started." });
								return (
									<div className="py-28 text-center">
										<Icon icon={info.icon} className="mx-auto text-faint" size={32} />
										<h2 className="mt-4 text-lg font-medium">{info.title}</h2>
										<p className="mx-auto mt-1 max-w-sm text-sm text-muted">{info.text}</p>
									</div>
								);
							})()}
						</>
					)}
				</section>
			</main>

			<button className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-2xl bg-ink text-white shadow-lg transition hover:bg-black hover:shadow-xl md:rounded-full" onClick={() => setShowUpload(true)} aria-label="Add photos">
				<Icon icon={IconCloudUpload} size={24} />
			</button>

			{viewerPhoto && (
				<div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" onClick={() => setViewerIndex(null)}>
					<div className="flex items-center justify-between p-4 text-white" onClick={(event) => event.stopPropagation()}>
						<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" onClick={() => setViewerIndex(null)} aria-label="Close"><Icon icon={IconX} /></button>
						<div className="flex items-center gap-1">
							<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Favorite"><Icon icon={IconHeart} /></button>
							<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Share"><Icon icon={IconShare} /></button>
							<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Info"><Icon icon={IconInfoCircle} /></button>
							<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Delete"><Icon icon={IconTrash} /></button>
						</div>
					</div>
					<div className="flex flex-1 items-center overflow-hidden px-2 md:px-12" onClick={(event) => event.stopPropagation()}>
						{viewerIndex > 0 && <button className="absolute left-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 md:left-5" onClick={() => setViewerIndex(viewerIndex - 1)} aria-label="Previous photo"><Icon icon={IconChevronLeft} size={24} /></button>}
						<img src={viewerImage} alt={viewerPhoto.title} className="mx-auto max-h-[78vh] max-w-full object-contain md:max-w-[82vw]" />
						{viewerIndex < filteredPhotos.length - 1 && <button className="absolute right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 md:right-5" onClick={() => setViewerIndex(viewerIndex + 1)} aria-label="Next photo"><Icon icon={IconChevronRight} size={24} /></button>}
					</div>
					<div className="flex items-center justify-between px-5 pb-5 pt-3 text-white" onClick={(event) => event.stopPropagation()}>
						<div className="text-sm"><strong>{viewerPhoto.date}</strong><p className="text-xs text-white/60">{viewerPhoto.time}</p></div>
						<div className="flex items-center gap-2 text-xs text-white/80"><Icon icon={IconInfoCircle} size={14} /> {viewerPhoto.location}</div>
					</div>
				</div>
			)}

			{showUpload && (
				<div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5" onClick={() => setShowUpload(false)}>
					<div className="relative w-full max-w-md rounded-3xl bg-panel p-8 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
						<button className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-black/5" onClick={() => setShowUpload(false)} aria-label="Close upload dialog"><Icon icon={IconX} /></button>
						<div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-black/5 text-ink"><Icon icon={IconCloudUpload} size={26} /></div>
						<h2 className="mt-5 text-xl font-medium">Upload to your archive</h2>
						<p className="mx-auto mt-2 max-w-xs text-sm text-muted">Add photos and videos from your device. They will be backed up automatically.</p>
						<button className="mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-medium text-white transition hover:bg-black" onClick={() => setShowUpload(false)}>
							<Icon icon={IconCloudUpload} size={18} /> Select from computer
						</button>
						<p className="mt-4 text-[11px] text-faint">JPG, PNG, HEIC, MOV, MP4</p>
					</div>
				</div>
			)}
		</div>
	);
}
