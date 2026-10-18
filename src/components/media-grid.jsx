"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	IconCheck,
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight,
	IconDownload,
	IconDotsVertical,
	IconHeart,
	IconInfoCircle,
	IconLock,
	IconPhoto,
	IconPlayerPlay,
	IconSearch,
	IconShare,
	IconTrash,
	IconWand,
	IconX,
} from "@tabler/icons-react";

function Icon({ icon: IconComponent, className = "", size = 20 }) {
	return <IconComponent className={className} size={size} stroke={1.8} aria-hidden="true" />;
}

function MoreMenu({ open, setOpen }) {
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
	}, [open, setOpen]);

	const itemClass = "flex w-full items-center px-4 py-2.5 text-left text-sm text-ink transition hover:bg-black/5";

	return (
		<div className="relative" ref={menuRef}>
			<button onClick={() => setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="More options" aria-expanded={open}>
				<Icon icon={IconDotsVertical} />
			</button>
			{open && (
				<div className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-panel py-1.5 shadow-xl">
					<button className={itemClass}>Rename</button>
					<button className={itemClass}>Copy link</button>
					<button className={itemClass}>Move to vault</button>
				</div>
			)}
		</div>
	);
}

const emptyIcons = { photo: IconPhoto, search: IconSearch, lock: IconLock, trash: IconTrash, wand: IconWand };

export default function MediaGrid({ photos, query = "", emptyState = {} }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [selection, setSelection] = useState(new Set());
	const [moreOpen, setMoreOpen] = useState(false);

	const queryText = query.toLowerCase();
	const visiblePhotos = query ? photos.filter((photo) => `${photo.title} ${photo.location}`.toLowerCase().includes(queryText)) : photos;

	const sections = visiblePhotos.reduce((groups, photo) => {
		const last = groups[groups.length - 1];
		if (last && last.date === photo.date) last.photos.push(photo);
		else groups.push({ date: photo.date, photos: [photo] });
		return groups;
	}, []);

	const selectedPhoto = searchParams.get("photo");
	const viewerIndex = selectedPhoto ? visiblePhotos.findIndex((photo) => String(photo.id) === selectedPhoto) : -1;
	const viewerPhoto = viewerIndex >= 0 ? visiblePhotos[viewerIndex] : null;

	const setViewerPhoto = (id, method = "push") => {
		const params = new URLSearchParams(searchParams.toString());
		if (id === null) params.delete("photo");
		else params.set("photo", String(id));
		const qs = params.toString();
		router[method](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	};

	useEffect(() => {
		if (viewerIndex < 0) return;
		const onKey = (event) => {
			if (event.key === "Escape") {
				if (moreOpen) {
					setMoreOpen(false);
					return;
				}
				setViewerPhoto(null, "replace");
				return;
			}
			if (event.key === "ArrowRight" && viewerIndex < visiblePhotos.length - 1) setViewerPhoto(visiblePhotos[viewerIndex + 1].id, "replace");
			if (event.key === "ArrowLeft" && viewerIndex > 0) setViewerPhoto(visiblePhotos[viewerIndex - 1].id, "replace");
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [viewerIndex, visiblePhotos, moreOpen]);

	const toggleSelect = (id) => {
		const next = new Set(selection);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setSelection(next);
	};

	const fallbackState = query
		? { iconKey: "search", title: "No results found", text: `No matches for "${query}". Try a different search.` }
		: { iconKey: "photo", title: "No photos here", text: "Add some memories to get started." };
	const info = sections.length === 0 ? { ...fallbackState, ...emptyState } : null;

	return (
		<>
			{selection.size > 0 && (
				<div className="sticky top-0 z-20 flex h-14 items-center gap-4 bg-ink px-4 text-white md:px-8">
					<button onClick={() => setSelection(new Set())} aria-label="Clear selection">
						<Icon icon={IconX} />
					</button>
					<span className="text-sm font-medium">{selection.size} selected</span>
					<div className="ml-auto flex items-center gap-1">
						<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" aria-label="Add to favorites">
							<Icon icon={IconHeart} />
						</button>
						<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" aria-label="Share">
							<Icon icon={IconShare} />
						</button>
						<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" aria-label="Delete">
							<Icon icon={IconTrash} />
						</button>
					</div>
				</div>
			)}

			{sections.map((section) => (
				<div key={section.date} className="mb-6">
					<div className="sticky top-16 z-10 mb-2 flex items-center gap-2 bg-surface py-2 md:top-1">
						<h2 className="text-[15px] font-medium">{section.date}</h2>
						<span className="text-xs text-muted">· {section.photos.length} items</span>
						<button className="ml-1 grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-black/5" aria-label="Collapse section">
							<Icon icon={IconChevronDown} size={16} />
						</button>
					</div>
					<div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
						{section.photos.map((photo) => {
							const isSelected = selection.has(photo.id);
							return (
								<button key={photo.id} className={`group relative aspect-square overflow-hidden bg-[#ececec] outline-none transition focus-visible:ring-2 focus-visible:ring-ink ${isSelected ? "rounded-md ring-2 ring-inset ring-ink" : "rounded-lg"}`} onClick={() => (isSelected ? toggleSelect(photo.id) : setViewerPhoto(photo.id))}>
									<img src={photo.image} alt={photo.title} loading="lazy" className="h-full w-full object-cover" />
									{photo.type === "video" && (
										<span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/40 text-white">
											<Icon icon={IconPlayerPlay} size={12} />
										</span>
									)}
									<span className={`absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 transition ${isSelected ? "border-white bg-ink text-white opacity-100" : "border-white bg-black/20 text-transparent opacity-0 group-hover:opacity-100"}`} onClick={(event) => { event.stopPropagation(); toggleSelect(photo.id); }} aria-label="Select photo">
										<Icon icon={IconCheck} size={14} />
									</span>
									{photo.location && (
										<span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/50 to-transparent p-2 pt-6 text-left opacity-100 transition group-hover:opacity-100">
											<span className="line-clamp-1 text-[11px] text-white">{photo.location}</span>
										</span>
									)}
									<span className="pointer-events-none absolute inset-0 hidden rounded-lg group-hover:block group-hover:bg-black/10" />
								</button>
							);
						})}
					</div>
				</div>
			))}

			{info && (
				<div className="py-28 text-center">
					<Icon icon={emptyIcons[info.iconKey] ?? IconPhoto} className="mx-auto text-faint" size={32} />
					<h2 className="mt-4 text-lg font-medium">{info.title}</h2>
					<p className="mx-auto mt-1 max-w-sm text-sm text-muted">{info.text}</p>
				</div>
			)}

			{viewerPhoto && (
				<div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" onClick={() => setViewerPhoto(null, "replace")}>
					<div className="flex items-center justify-between p-4 text-white" onClick={(event) => event.stopPropagation()}>
						<div className="flex items-center gap-2">
							<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" onClick={() => setViewerPhoto(null, "replace")} aria-label="Close">
								<Icon icon={IconX} />
							</button>
							<p className="text-sm font-medium">{viewerPhoto.title}</p>
						</div>
						<div className="flex items-center gap-1">
							<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Favorite">
								<Icon icon={IconHeart} />
							</button>
							<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Download">
								<Icon icon={IconDownload} />
							</button>
							<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Info">
								<Icon icon={IconInfoCircle} />
							</button>
							<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Delete">
								<Icon icon={IconTrash} />
							</button>
							<MoreMenu open={moreOpen} setOpen={setMoreOpen} />
						</div>
					</div>
					<div className="flex flex-1 items-center overflow-hidden px-2 md:px-12" onClick={(event) => event.stopPropagation()}>
						{viewerIndex > 0 && (
							<button className="absolute left-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 md:left-5" onClick={() => setViewerPhoto(visiblePhotos[viewerIndex - 1].id, "replace")} aria-label="Previous photo">
								<Icon icon={IconChevronLeft} size={24} />
							</button>
						)}
						<img src={viewerPhoto.image.replace("w=800", "w=1400")} alt={viewerPhoto.title} className="mx-auto max-h-[78vh] max-w-full object-contain md:max-w-[82vw]" />
						{viewerIndex < visiblePhotos.length - 1 && (
							<button className="absolute right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 md:right-5" onClick={() => setViewerPhoto(visiblePhotos[viewerIndex + 1].id, "replace")} aria-label="Next photo">
								<Icon icon={IconChevronRight} size={24} />
							</button>
						)}
					</div>
					<div className="flex items-center justify-between px-5 pb-5 pt-3 text-white" onClick={(event) => event.stopPropagation()}>
						<div className="text-sm">
							<strong>{viewerPhoto.date}</strong>
							<p className="text-xs text-white/60">{viewerPhoto.time}</p>
						</div>
						<div className="flex items-center gap-2 text-xs text-white/80">
							<Icon icon={IconInfoCircle} size={14} /> {viewerPhoto.location}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
