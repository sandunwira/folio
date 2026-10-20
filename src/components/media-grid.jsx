"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addMediaToAlbumAction, bulkAddToAlbumAction, bulkArchiveAction, bulkFavoriteAction, bulkRestoreAction, bulkTrashAction, createAlbumAction, moveToArchiveAction, moveToVaultAction, removeMediaFromAlbumAction, renameMediaAction, restoreMediaAction, toggleMediaFavoriteAction, trashMediaAction } from "@/lib/actions";
import { IconPlus } from "@tabler/icons-react";
import {
	IconAlbum,
	IconArchive,
	IconArrowBackUp,
	IconCheck,
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight,
	IconDownload,
	IconDotsVertical,
	IconFolderPlus,
	IconHeart,
	IconHeartFilled,
	IconInfoCircle,
	IconLock,
	IconLocation,
	IconMinus,
	IconPhoto,
	IconPhotoOff,
	IconPlayerPlay,
	IconSearch,
	IconShare,
	IconTrash,
	IconWand,
	IconX,
} from "@tabler/icons-react";
import Icon from "@/components/icon";

function formatExifDate(iso) {
	const parsed = Date.parse(iso);
	return Number.isFinite(parsed) ? new Date(parsed).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
}

function formatExifTime(iso) {
	const parsed = Date.parse(iso);
	return Number.isFinite(parsed) ? new Date(parsed).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;
}

function buildInfoRows(photo, exifInfo) {
	const rows = [];
	const exif = exifInfo?.exif && typeof exifInfo.exif === "object" ? exifInfo.exif : null;
	rows.push(["File", `${photo.title}.${photo.mime.split("/")[1].toLowerCase()}`]);
	const captured = exif ? ["DateTimeOriginal", "CreateDate", "ModifyDate"].map((key) => exif[key]).find(Boolean) : null;
	rows.push(["Date", `${(captured ? formatExifTime(captured) : null) ?? photo.time}, ${(captured ? formatExifDate(captured) : null) ?? photo.date}`]);
	const width = exif ? (exif.ExifImageWidth ?? exif.ImageWidth) : null;
	const height = exif ? (exif.ExifImageHeight ?? exif.ImageHeight) : null;
	if (width && height) rows.push(["Resolution", `${width} × ${height}`]);
	if (photo.size) rows.push(["Size", photo.size]);
	const camera = exif ? [exif.Make, exif.Model].filter(Boolean).join(" ") : null;
	if (camera) rows.push(["Camera", camera]);
	if (exif?.FocalLength != null) {
		const focal = `${Number(exif.FocalLength).toFixed(1)} mm`;
		const equiv = exif.FocalLengthIn35mmFormat != null ? ` (${Number(exif.FocalLengthIn35mmFormat).toFixed(0)} mm equiv.)` : "";
		rows.push(["Focal length", `${focal}${equiv}`]);
	}
	if (exif?.FNumber != null) rows.push(["Aperture", `f/${exif.FNumber}`]);
	if (exif?.ISO != null) rows.push(["ISO", String(exif.ISO)]);
	return rows;
}

function MoreMenu({ open, setOpen, photo, onCopyLink, onVault, onArchive, onRenameSubmit, onFavorite, onDelete, onRestore, onAddToAlbum, addable = false }) {
	const menuRef = useRef(null);
	const [renaming, setRenaming] = useState(false);

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
				<div className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-panel py-1.5 shadow-xl">
					{renaming ? (
						<form action={onRenameSubmit} className="p-2">
							<input type="hidden" name="id" value={photo.id} />
							<input name="title" defaultValue={photo.title} autoFocus required placeholder="Media name" aria-label="Media name" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none" />
						</form>
					) : photo.trashed ? (
						<>
							<button className={`${itemClass} font-medium`} onClick={() => { setOpen(false); onRestore(); }}>Restore to library</button>
							<button className={itemClass} onClick={onCopyLink}>Copy link</button>
							<a className={`${itemClass}`} href={photo.large ?? photo.image} download target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>Download</a>
							{addable && <button className={`${itemClass}`} onClick={() => { setOpen(false); onAddToAlbum(); }}>Add to album</button>}
							<button className={`${itemClass} text-red-600`} onClick={() => { setOpen(false); onDelete(); }}>Delete permanently</button>
						</>
					) : (
						<>
							<button className={itemClass} onClick={() => setRenaming(true)}>Rename</button>
							<button className={`${itemClass} md:hidden`} onClick={() => { setOpen(false); onFavorite(); }}>{photo.favorite ? "Remove from favorites" : "Add to favorites"}</button>
							<a className={`${itemClass} md:hidden`} href={photo.large ?? photo.image} download target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>Download</a>
							{addable && <button className={`${itemClass} md:hidden`} onClick={() => { setOpen(false); onAddToAlbum(); }}>Add to album</button>}
							<button className={itemClass} onClick={onCopyLink}>Copy link</button>
							<button className={itemClass} onClick={onArchive}>{photo.archived ? "Restore from archive" : "Move to archive"}</button>
							<button className={itemClass} onClick={onVault}>{photo.vaulted ? "Restore from vault" : "Move to vault"}</button>
							<button className={`${itemClass} md:hidden`} onClick={() => { setOpen(false); onDelete(); }}>Move to trash</button>
						</>
					)}
				</div>
			)}
		</div>
	);
}

const emptyIcons = { photo: IconPhoto, search: IconSearch, lock: IconLock, trash: IconTrash, wand: IconWand, archive: IconArchive };

export default function MediaGrid({ photos, query = "", emptyState = {}, addable = false, removableAlbumId = null, restore = false, archiveOnly = false }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [selection, setSelection] = useState(new Set());
	const [moreOpen, setMoreOpen] = useState(false);
	const [infoOpen, setInfoOpen] = useState(false);
	const [exifById, setExifById] = useState({});
	const exifFetchRef = useRef({});
	const [toast, setToast] = useState(null);
	const [albumPicker, setAlbumPicker] = useState(null);
	const [confirmTrashOpen, setConfirmTrashOpen] = useState(false);
	const [albumChoices, setAlbumChoices] = useState(null);
	const [albumNameInput, setAlbumNameInput] = useState("");
	const infoButtonRef = useRef(null);
	const infoPanelRef = useRef(null);

	const queryText = query.toLowerCase();
	const visiblePhotos = query ? photos.filter((photo) => `${photo.title} ${photo.estLocation || photo.location}`.toLowerCase().includes(queryText)) : photos;

	const sections = visiblePhotos.reduce((groups, photo) => {
		const last = groups[groups.length - 1];
		if (last && last.date === photo.date) last.photos.push(photo);
		else groups.push({ date: photo.date, photos: [photo] });
		return groups;
	}, []);

	const selectedPhoto = searchParams.get("photo");
	const viewerIndex = selectedPhoto ? visiblePhotos.findIndex((photo) => String(photo.id) === selectedPhoto) : -1;
	const viewerPhoto = viewerIndex >= 0 ? visiblePhotos[viewerIndex] : null;
	const viewerOpen = !!viewerPhoto;

	const setViewerPhoto = (id, method = "push") => {
		const params = new URLSearchParams(searchParams.toString());
		if (id === null) params.delete("photo");
		else params.set("photo", String(id));
		const qs = params.toString();
		router[method](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	};

	useEffect(() => {
		if (viewerIndex < 0 && !albumPicker) return;
		const onKey = (event) => {
			if (event.key === "Escape") {
				if (albumPicker) {
					setAlbumPicker(null);
					return;
				}
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
	}, [viewerIndex, visiblePhotos, moreOpen, albumPicker]);

	useEffect(() => {
		if (!confirmTrashOpen) return;
		const onKeyDown = (event) => {
			if (event.key === "Escape") setConfirmTrashOpen(false);
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [confirmTrashOpen]);

	useEffect(() => {
		if (!albumPicker && !confirmTrashOpen) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [albumPicker, confirmTrashOpen]);

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(null), 2500);
		return () => clearTimeout(timer);
	}, [toast]);

	useEffect(() => {
		const photoId = infoOpen ? (viewerPhoto?.id ?? null) : null;
		if (!photoId || exifFetchRef.current[photoId]) return;
		exifFetchRef.current[photoId] = true;
		const loadExif = async () => {
			try {
				const response = await fetch(`/api/media/${photoId}/exif`);
				const data = response.ok ? await response.json() : { exif: {}, place: null };
				setExifById((prev) => ({ ...prev, [photoId]: { exif: data.exif ?? {}, place: data.place ?? null } }));
			} catch {
				setExifById((prev) => ({ ...prev, [photoId]: { exif: {}, place: null } }));
			}
		};
		loadExif();
	}, [infoOpen, viewerPhoto?.id]);

	useEffect(() => {
		if (!infoOpen) return;
		const onDown = (event) => {
			if (infoPanelRef.current?.contains(event.target) || infoButtonRef.current?.contains(event.target)) return;
			setInfoOpen(false);
		};
		const onKeyDown = (event) => {
			if (event.key === "Escape") setInfoOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [infoOpen]);

	useEffect(() => {
		if (!viewerOpen) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [viewerOpen]);

	const toggleSelect = (id) => {
		const next = new Set(selection);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setSelection(next);
	};

	const toggleSection = (section) => {
		const ids = section.photos.map((photo) => photo.id);
		const allSelected = ids.every((id) => selection.has(id));
		const next = new Set(selection);
		if (allSelected) ids.forEach((id) => next.delete(id));
		else ids.forEach((id) => next.add(id));
		setSelection(next);
	};

	const [collapsedDates, setCollapsedDates] = useState(() => new Set());
	const [cardPreviewFailures, setCardPreviewFailures] = useState(() => new Set());
	const [viewerPreviewFailures, setViewerPreviewFailures] = useState(() => new Set());

	const toggleCollapsedDate = (date) => {
		setCollapsedDates((current) => {
			const next = new Set(current);
			if (next.has(date)) next.delete(date);
			else next.add(date);
			return next;
		});
	};

	const flashToast = (result, okText, errorText) => {
		setToast(result?.error ? { kind: "error", text: result.error ?? errorText ?? "Something went wrong." } : { kind: "ok", text: typeof okText === "function" ? okText(result) : okText });
	};

	const favoritePhoto = async (photo) => {
		const result = await toggleMediaFavoriteAction(photo.id);
		flashToast(result, (res) => (res.favorite ? "Added to favorites." : "Removed from favorites."));
		router.refresh();
	};

	const deletePhoto = async (photo) => {
		const result = await trashMediaAction(photo.id);
		flashToast(result, (res) => (res.trashed ? "Moved to Trash." : "Deleted permanently."));
		router.refresh();
	};

	const restorePhoto = async (photo) => {
		const result = await restoreMediaAction(photo.id);
		flashToast(result, "Restored to your library.");
		setMoreOpen(false);
		setCardMenuFor(null);
		router.refresh();
	};

	const restoreSelection = async () => {
		const ids = [...selection];
		const result = await bulkRestoreAction(ids);
		flashToast(result, (res) => `Restored ${plural(res.count)} to your library.`);
		setSelection(new Set());
		router.refresh();
	};

	const vaultPhoto = async (photo) => {
		const result = await moveToVaultAction(photo.id);
		flashToast(result, (res) => (res.vaulted ? "Moved to Vault." : "Removed from Vault."));
		setMoreOpen(false);
		router.refresh();
	};

	const archivePhoto = async (photo) => {
		const result = await moveToArchiveAction(photo.id);
		flashToast(result, (res) => (res.archived ? "Moved to Archive." : "Removed from Archive."));
		setMoreOpen(false);
		router.refresh();
	};

	const loadAlbumChoices = async () => {
		try {
			const response = await fetch("/api/albums");
			const data = response.ok ? await response.json() : { albums: [] };
			setAlbumChoices(data.albums ?? []);
		} catch {
			setAlbumChoices([]);
		}
	};

	const openCardAlbumMenu = (photo) => {
		loadAlbumChoices();
		setAlbumPicker({ kind: "card", photoId: photo.id, title: photo.title, remove: !!removableAlbumId });
	};

	const toggleViewerAlbumMenu = () => {
		loadAlbumChoices();
		setAlbumPicker({ kind: "viewer", photoId: viewerPhoto.id, title: viewerPhoto.title });
	};

	const toggleBulkAlbumMenu = () => {
		loadAlbumChoices();
		setAlbumPicker({ kind: "bulk" });
	};

	const closeAlbumPicker = () => setAlbumPicker(null);

	const addPhotoToAlbum = async (album, photoId) => {
		const result = await addMediaToAlbumAction(album.id, photoId);
		flashToast(result, `Added to "${album.name}".`);
		closeAlbumPicker();
		router.refresh();
	};

	const removePhotoFromAlbum = async (photoId) => {
		const result = await removeMediaFromAlbumAction(removableAlbumId, photoId);
		flashToast(result, "Removed from album.");
		closeAlbumPicker();
		router.refresh();
	};

	const createAlbumInline = async (event) => {
		event.preventDefault();
		const name = albumNameInput.trim();
		if (!name) return;
		const formData = new FormData();
		formData.set("name", name);
		const result = await createAlbumAction(formData);
		flashToast(result, `Album "${name}" created.`);
		if (!result.error) {
			setAlbumNameInput("");
			loadAlbumChoices();
			router.refresh();
		}
	};

	const copyViewerLink = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setToast({ kind: "ok", text: "Link copied to clipboard." });
		} catch {
			setToast({ kind: "error", text: "Couldn't copy the link." });
		}
		setMoreOpen(false);
	};

	const submitRename = async (formData) => {
		const result = await renameMediaAction(formData);
		flashToast(result, "Renamed successfully.");
		setMoreOpen(false);
		router.refresh();
	};

	const plural = (count) => `item${count === 1 ? "" : "s"}`;

	const favoriteSelection = async () => {
		const ids = [...selection];
		const result = await bulkFavoriteAction(ids);
		flashToast(result, (res) => (res.favorite ? `Added ${plural(res.count)} to favorites.` : `Removed ${plural(res.count)} from favorites.`));
		setSelection(new Set());
		router.refresh();
	};

	const archiveSelection = async () => {
		const ids = [...selection];
		const result = await bulkArchiveAction(ids);
		flashToast(result, (res) => (res.archived ? `Moved ${plural(res.count)} to Archive.` : `Removed ${plural(res.count)} from Archive.`));
		setSelection(new Set());
		router.refresh();
	};

	const trashSelection = () => setConfirmTrashOpen(true);

	const confirmTrash = async () => {
		const ids = [...selection];
		setConfirmTrashOpen(false);
		const result = await bulkTrashAction(ids);
		flashToast(result, (res) => `Moved ${plural(res.count)} to Trash.`);
		setSelection(new Set());
		router.refresh();
	};

	const downloadSelection = () => {
		if (selection.size === 0) return;
		const anchor = document.createElement("a");
		anchor.href = `/api/download?ids=${encodeURIComponent([...selection].join(","))}`;
		anchor.rel = "noreferrer";
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
	};

	const addSelectionToAlbum = async (album) => {
		const ids = [...selection];
		setBulkAlbumOpen(false);
		const result = await bulkAddToAlbumAction(album.id, ids);
		flashToast(result, (res) => `Added ${plural(res.count)} to "${album.name}".`);
		setSelection(new Set());
		router.refresh();
	};

	const fallbackState = query
		? { iconKey: "search", title: "No results found", text: `No matches for "${query}". Try a different search.` }
		: { iconKey: "photo", title: "No photos here", text: "Add some memories to get started." };
	const info = sections.length === 0 ? { ...fallbackState, ...emptyState } : null;

	const infoRows = viewerPhoto ? buildInfoRows(viewerPhoto, exifById[viewerPhoto.id] ?? null) : [];

	return (
		<>
			{selection.size > 0 && (
				<div className="sticky top-0 z-20 flex h-14 items-center gap-4 bg-ink px-4 text-white md:px-8">
					<button onClick={() => setSelection(new Set())} aria-label="Clear selection">
						<Icon icon={IconX} />
					</button>
					<span className="text-sm font-medium">{selection.size} {selection.size === 1 ? "item" : "items"} selected</span>
					<div className="ml-auto flex items-center gap-1">
						{restore || archiveOnly ? (
							<span className="flex items-center gap-1">
								<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" onClick={restore ? restoreSelection : archiveSelection} aria-label={restore ? "Restore to library" : "Restore from archive"}>
									<Icon icon={IconArrowBackUp} />
								</button>
								{!restore && (
									<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" onClick={downloadSelection} aria-label="Download">
										<Icon icon={IconDownload} />
									</button>
								)}
							</span>
						) : (
							<>
								<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" onClick={favoriteSelection} aria-label={photos.some((photo) => selection.has(photo.id) && !photo.favorite) ? "Add to favorites" : "Remove from favorites"}>
									<Icon icon={IconHeart} />
								</button>
								<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" onClick={downloadSelection} aria-label="Download">
									<Icon icon={IconDownload} />
								</button>
								{addable && (
									<button className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/15" onClick={toggleBulkAlbumMenu} aria-label="Add to album">
										<Icon icon={IconFolderPlus} />
									</button>
								)}
								<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" onClick={archiveSelection} aria-label={photos.some((photo) => selection.has(photo.id) && !photo.archived) ? "Move to archive" : "Restore from archive"}>
									<Icon icon={IconArchive} />
								</button>
								<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" aria-label="Share">
									<Icon icon={IconShare} />
								</button>
							</>
						)}
						<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" onClick={trashSelection} aria-label={restore || archiveOnly ? "Delete" : "Move to trash"}>
							<Icon icon={IconTrash} />
						</button>
					</div>
				</div>
			)}

			{sections.map((section) => {
				const sectionSelected = section.photos.filter((photo) => selection.has(photo.id)).length;
				const allSelected = sectionSelected === section.photos.length;
				const collapsed = collapsedDates.has(section.date);
				return (
					<div key={section.date} className="mb-3">
						<div className="sticky top-16 z-10 mb-2 flex items-center gap-2.5 bg-surface py-2 md:top-1">
							<button
								className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${allSelected ? "border-ink bg-ink text-white" : sectionSelected > 0 ? "border-ink bg-ink/10 text-ink" : "border-faint bg-panel text-transparent hover:border-ink"}`}
								onClick={() => toggleSection(section)}
								aria-label={allSelected ? "Deselect all in group" : "Select all in group"}
								aria-pressed={allSelected}
							>
								<Icon icon={allSelected ? IconCheck : IconMinus} size={13} />
							</button>
							<h2 className="text-[15px] font-medium">{section.date}</h2>
							<span className="text-xs text-muted">· {section.photos.length} items</span>
							<button className={`ml-1 grid h-7 w-7 place-items-center rounded-full text-muted transition-transform duration-200 hover:bg-black/5 ${collapsed ? "-rotate-90" : ""}`} onClick={() => toggleCollapsedDate(section.date)} aria-label={collapsed ? "Expand section" : "Collapse section"} aria-expanded={!collapsed}>
								<Icon icon={IconChevronDown} size={16} />
							</button>
						</div>
						<div className={collapsed ? "hidden" : "grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"}>
							{section.photos.map((photo) => {
								const isSelected = selection.has(photo.id);
								return (
									<div key={photo.id} className="group relative">
										<button className={`relative aspect-square overflow-hidden bg-[#ececec] outline-none transition focus-visible:ring-2 focus-visible:ring-ink ${isSelected ? "rounded-md ring-2 ring-inset ring-ink" : "rounded-lg"}`} onClick={() => (isSelected ? toggleSelect(photo.id) : setViewerPhoto(photo.id))}>
											{cardPreviewFailures.has(photo.id) ? (
												<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-white/60 text-muted">
													<Icon icon={IconPhotoOff} size={26} />
													<span className="text-[11px] font-medium text-ink">No preview</span>
													<span className="text-[10px] text-faint">{photo.mime.split("/")[1].toUpperCase()}</span>
												</div>
											) : (
												<img src={photo.image} alt={photo.title} loading="lazy" className="h-full w-full object-cover" onError={() => setCardPreviewFailures((current) => new Set(current).add(photo.id))} />
											)}
											{photo.type === "video" && (
												<span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/40 text-white">
													<Icon icon={IconPlayerPlay} size={12} />
												</span>
											)}
											{photo.favorite && (
												<span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/40 text-white" aria-label="Favorite">
													<Icon icon={IconHeartFilled} size={12} />
												</span>
											)}
											<span className={`absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 transition ${isSelected ? "border-white bg-ink text-white opacity-100" : "border-white bg-black/20 text-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100"}`} onClick={(event) => { event.stopPropagation(); toggleSelect(photo.id); }} aria-label="Select photo">
												<Icon icon={IconCheck} size={14} />
											</span>
											{(photo.estLocation || photo.location) && (
												<span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/50 to-transparent p-2 pt-6 text-left opacity-100 transition group-hover:opacity-100">
													<span className="line-clamp-1 text-[11px] text-white">{[photo.estCity, photo.estCountry].filter(Boolean).join(", ")}</span>
												</span>
											)}
											<span className="pointer-events-none absolute inset-0 hidden rounded-lg group-hover:block group-hover:bg-black/10" />
										</button>
										{(addable || removableAlbumId) && (
											<button className={`absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white opacity-100 transition md:opacity-0 md:group-hover:opacity-100`} onClick={(event) => { event.stopPropagation(); openCardAlbumMenu(photo); }} aria-label="Album options">
												<Icon icon={IconFolderPlus} size={15} />
											</button>
										)}
										{(restore || archiveOnly) && (
											<button className={`absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white opacity-100 transition md:opacity-0 md:group-hover:opacity-100`} onClick={(event) => { event.stopPropagation(); (restore ? restorePhoto : archivePhoto)(photo); }} aria-label={restore ? "Restore to library" : "Restore to your media"}>
												<Icon icon={IconArrowBackUp} size={15} />
											</button>
										)}
									</div>
								);
							})}
						</div>
					</div>
				);
			})}

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
							<p className="text-sm font-medium">{viewerPhoto.title}.{viewerPhoto.mime.split("/")[1].toLowerCase()}</p>
						</div>
						<div className="flex items-center gap-1">
							{archiveOnly ? (
								<>
									<a className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" href={`/api/download?ids=${viewerPhoto.id}`} download aria-label="Download">
										<Icon icon={IconDownload} />
									</a>
									<button ref={infoButtonRef} className={`grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/10 ${infoOpen ? "bg-white/20" : ""}`} onClick={() => setInfoOpen((value) => !value)} aria-label="Info" aria-pressed={infoOpen}>
										<Icon icon={IconInfoCircle} />
									</button>
									<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" onClick={() => archivePhoto(viewerPhoto)} aria-label="Restore to your media">
										<Icon icon={IconArrowBackUp} />
									</button>
									<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" onClick={() => deletePhoto(viewerPhoto)} aria-label="Delete">
										<Icon icon={IconTrash} />
									</button>
								</>
							) : (
								<>
									<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-md:hidden" onClick={() => favoritePhoto(viewerPhoto)} aria-label={viewerPhoto.favorite ? "Remove from favorites" : "Add to favorites"}>
										<Icon icon={viewerPhoto.favorite ? IconHeartFilled : IconHeart} />
									</button>
									<a className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-md:hidden" href={viewerPhoto.large ?? viewerPhoto.image} download target="_blank" rel="noreferrer" aria-label="Download">
										<Icon icon={IconDownload} />
									</a>
									{addable && (
										<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-md:hidden" onClick={toggleViewerAlbumMenu} aria-label="Add to album">
											<Icon icon={IconFolderPlus} />
										</button>
									)}
									<button ref={infoButtonRef} className={`grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/10 ${infoOpen ? "bg-white/20" : ""}`} onClick={() => setInfoOpen((value) => !value)} aria-label="Info" aria-pressed={infoOpen}>
										<Icon icon={IconInfoCircle} />
									</button>
									{restore && (
										<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-md:hidden" onClick={() => restorePhoto(viewerPhoto)} aria-label="Restore to library">
											<Icon icon={IconArrowBackUp} />
										</button>
									)}
									<button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-md:hidden" onClick={() => deletePhoto(viewerPhoto)} aria-label={restore ? "Delete permanently" : "Delete"}>
										<Icon icon={IconTrash} />
									</button>
									<MoreMenu key={viewerPhoto.id} open={moreOpen} setOpen={setMoreOpen} photo={viewerPhoto} onCopyLink={copyViewerLink} onVault={() => vaultPhoto(viewerPhoto)} onArchive={() => archivePhoto(viewerPhoto)} onRenameSubmit={submitRename} onFavorite={() => favoritePhoto(viewerPhoto)} onDelete={() => deletePhoto(viewerPhoto)} onRestore={() => restorePhoto(viewerPhoto)} onAddToAlbum={toggleViewerAlbumMenu} addable={addable} />
								</>
							)}
						</div>
					</div>
					<div className="flex flex-1 items-center overflow-hidden px-2 md:px-12" onClick={(event) => event.stopPropagation()}>
						{viewerIndex > 0 && (
							<button className="absolute left-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 md:left-5" onClick={() => setViewerPhoto(visiblePhotos[viewerIndex - 1].id, "replace")} aria-label="Previous photo">
								<Icon icon={IconChevronLeft} size={24} />
							</button>
						)}
						{viewerPreviewFailures.has(viewerPhoto.id) ? (
							<div className="mx-auto flex flex-col items-center gap-2 rounded-2xl bg-white/5 px-8 py-10 text-center text-white">
								<Icon icon={IconPhotoOff} size={46} stroke={1} className="text-zinc-400 mb-4" />
								<p className="text-sm font-medium">No preview available</p>
								<p className="max-w-xs text-xs leading-5 text-white/60">{viewerPhoto.mime.toUpperCase()} - this browser can&apos;t display the original file format.</p>
								<a href={viewerPhoto.large ?? viewerPhoto.image} download className="mt-1 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/25" onClick={(event) => event.stopPropagation()}>
									Download original
								</a>
							</div>
						) : (
							<img key={viewerPhoto.id} src={viewerPhoto.large ?? viewerPhoto.image} alt={viewerPhoto.title} className="mx-auto max-h-[78vh] max-w-full object-contain md:max-w-[82vw]" onError={() => setViewerPreviewFailures((current) => new Set(current).add(viewerPhoto.id))} />
						)}
						{viewerIndex < visiblePhotos.length - 1 && (
							<button className="absolute right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 md:right-5" onClick={() => setViewerPhoto(visiblePhotos[viewerIndex + 1].id, "replace")} aria-label="Next photo">
								<Icon icon={IconChevronRight} size={24} />
							</button>
						)}
					</div>
					{infoOpen && (
						<div ref={infoPanelRef} className="absolute top-16 right-8 z-10 max-h-[80vh] w-60 md:w-60 max-w-60 overflow-y-auto rounded-xl bg-zinc-800 p-4 text-sm text-white drop-shadow-2xl drop-shadow-black" onClick={(event) => event.stopPropagation()}>
							<div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-xs">
								{infoRows.map(([label, value]) => (
									<div key={label} className="col-span-2 grid grid-cols-subgrid">
										<span className="shrink-0 text-white/60">{label}</span>
										<span className="break-all text-right">{value}</span>
									</div>
								))}
							</div>
						</div>
					)}
					<div className="flex items-center justify-between px-5 pb-5 pt-3 text-white" onClick={(event) => event.stopPropagation()}>
						<div className="text-sm">
							<strong>{viewerPhoto.date}</strong>
							<p className="text-xs text-white/60">{viewerPhoto.time}</p>
						</div>
						{(viewerPhoto.estCity || viewerPhoto.estLocation) && (
							<div className="flex items-center gap-2 text-xs text-white/80">
								<Icon icon={IconLocation} size={14} /> {[viewerPhoto.estCity, viewerPhoto.estCountry].filter(Boolean).join(", ")}
							</div>
						)}
					</div>
				</div>
			)}

			{confirmTrashOpen && selection.size > 0 && (
				<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5" onClick={() => setConfirmTrashOpen(false)}>
					<div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-6" onClick={(event) => event.stopPropagation()}>
						<h2 className="text-lg font-medium">Move to trash?</h2>
						<p className="mt-1 text-xs text-muted">
							{selection.size === 1
								? "This item moves to Trash and is permanently deleted after 30 days."
								: `These ${selection.size} items move to Trash and are permanently deleted after 30 days.`}
						</p>
						<div className="mt-5 flex justify-end gap-3">
							<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={() => setConfirmTrashOpen(false)}>
								Cancel
							</button>
							<button type="button" className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black" onClick={confirmTrash}>
								Move to trash
							</button>
						</div>
					</div>
				</div>
			)}

			{albumPicker && (
				<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5" onClick={closeAlbumPicker}>
					<div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-6" onClick={(event) => event.stopPropagation()}>
						<h2 className="text-lg font-medium">{albumPicker.remove ? "Album actions" : "Add to album"}</h2>
						<p className="mt-1 text-xs text-muted">
							{albumPicker.remove
								? `Remove "${albumPicker.title}" from this album.`
								: albumPicker.kind === "bulk"
									? `${selection.size} ${selection.size === 1 ? "item" : "items"} will be added.`
									: `Pick an album for "${albumPicker.title}".`}
						</p>
						{albumPicker.remove ? (
							<button className="mt-4 flex w-full items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-black/5" onClick={() => removePhotoFromAlbum(albumPicker.photoId)}>
								<Icon icon={IconTrash} size={16} /> Remove from album
							</button>
						) : (
							<>
								<div className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-line bg-surface p-1.5">
									{albumChoices === null ? (
										<p className="px-2.5 py-2 text-xs text-muted">Loading albums…</p>
									) : albumChoices.length === 0 ? (
										<p className="px-2.5 py-2 text-xs text-muted">No albums yet. Create one below.</p>
									) : (
										albumChoices.map((album) => (
											<button key={album.id} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition hover:bg-black/5" onClick={() => (albumPicker.kind === "bulk" ? addSelectionToAlbum(album) : addPhotoToAlbum(album, albumPicker.photoId))}>
												<Icon icon={IconAlbum} size={15} />
												<span className="min-w-0 flex-1 truncate">{album.name}</span>
												<span className="text-xs text-faint">{album.count}</span>
											</button>
										))
									)}
								</div>
								<form onSubmit={createAlbumInline} className="mt-3 flex items-center gap-2">
									<input value={albumNameInput} onChange={(event) => setAlbumNameInput(event.target.value)} maxLength={80} placeholder="New album name" aria-label="New album name" className="h-10 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-xs text-ink outline-none placeholder:text-faint focus:border-ink" />
									<button type="submit" disabled={!albumNameInput.trim()} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-black disabled:opacity-40" aria-label="Create album">
										<Icon icon={IconPlus} size={14} />
									</button>
								</form>
							</>
						)}
					</div>
				</div>
			)}

			{toast && (
				<div className="fixed bottom-24 left-1/2 z-60 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-white shadow-lg" role="status">
					{toast.text}
				</div>
			)}
		</>
	);
}
