"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	IconAlertCircle,
	IconAlertTriangle,
	IconAlbum,
	IconArchive,
	IconCheck,
	IconCircleCheckFilled,
	IconCloudUpload,
	IconHeart,
	IconLock,
	IconMap,
	IconMenu2,
	IconPhoto,
	IconRefresh,
	IconSearch,
	IconTrash,
	IconUsers,
	IconWand,
	IconX,
} from "@tabler/icons-react";
import Icon from "@/components/icon";
import UserMenu from "@/components/user-menu";
import { formatBytes } from "@/lib/format";

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

function UploadModal({ onClose, onSubmit }) {
	const [picked, setPicked] = useState([]);

	const onPick = (event) => {
		const list = [...event.target.files];
		if (list.length > 0) {
			setPicked((current) => {
				const seen = new Set(current.map((file) => `${file.name}:${file.size}`));
				return [...current, ...list.filter((file) => !seen.has(`${file.name}:${file.size}`))];
			});
		}
		event.target.value = "";
	};

	const removeFile = (index) => setPicked((current) => current.filter((_, i) => i !== index));

	return (
		<div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5" onClick={onClose}>
			<div className="relative w-full max-w-md rounded-3xl bg-panel p-8 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
				<button type="button" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-black/5" onClick={onClose} aria-label="Close upload dialog">
					<Icon icon={IconX} />
				</button>
				<div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-black/5 text-ink">
					<Icon icon={IconCloudUpload} size={26} />
				</div>
				<h2 className="mt-5 text-xl font-medium">Upload to your archive</h2>
				<p className="mx-auto mt-2 max-w-xs text-sm text-muted">Add photos and videos from your device. They will be backed up automatically.</p>
				<label className="mt-6 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-line text-sm font-medium text-ink transition hover:bg-black/5">
					<Icon icon={IconCloudUpload} size={18} /> Select from computer
					<input type="file" multiple accept="image/*,video/*" className="hidden" onChange={onPick} />
				</label>
				{picked.length > 0 && (
					<div className="mt-4 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line p-2 text-left">
						{picked.map((file, index) => (
							<div key={`${file.name}:${file.size}:${index}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-black/5">
								<span className="min-w-0 flex-1 truncate text-ink">{file.name}</span>
								<span className="shrink-0 text-muted">{formatBytes(file.size)}</span>
								<button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`} className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted hover:bg-black/10 hover:text-ink">
									<Icon icon={IconX} size={12} />
								</button>
							</div>
						))}
					</div>
				)}
				<button type="button" disabled={picked.length === 0} onClick={() => onSubmit(picked)} className="mt-4 h-11 w-full rounded-full bg-ink text-sm font-medium text-white transition hover:bg-black disabled:opacity-60">
					Upload {picked.length > 0 ? `${picked.length} item${picked.length === 1 ? "" : "s"}` : ""}
				</button>
				<p className="mt-4 text-[11px] text-faint">JPG, PNG, HEIC, MOV, MP4</p>
			</div>
		</div>
	);
}

function uploadOne(file, onProgress) {
	return new Promise((resolve, reject) => {
		const form = new FormData();
		form.append("files", file);
		form.append("lastModified", String(file.lastModified ?? Date.now()));
		const xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/upload");
		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) onProgress(event.loaded / event.total);
		};
		xhr.onload = () => {
			let data = {};
			try {
				data = JSON.parse(xhr.responseText);
			} catch {
				data = {};
			}
			if (xhr.status === 200) resolve(data);
			else reject(new Error(data.error ?? "Upload failed"));
		};
		xhr.onerror = () => reject(new Error("Network error"));
		xhr.send(form);
	});
}

function UploadTray({ task, onClose, onRetry }) {
	const failed = task.items.filter((item) => item.status === "failed").length;
	const skipped = task.items.filter((item) => item.status === "skipped").length;
	const finishedCount = task.items.filter((item) => item.status !== "waiting" && item.status !== "uploading").length;
	const percent = Math.round((finishedCount / task.items.length) * 100);
	const headline = task.finished ? `Upload finished · ${task.items.length - failed - skipped} done${skipped ? ` · ${skipped} skipped` : ""}${failed ? ` · ${failed} failed` : ""}` : `Uploading ${finishedCount}/${task.items.length} · ${percent}%`;
	const statusIcons = {
		done: { icon: IconCircleCheckFilled, className: "text-green-600" },
		failed: { icon: IconAlertTriangle, className: "text-danger" },
		skipped: { icon: IconAlertCircle, className: "text-warning" },
	};

	return (
		<div className="fixed bottom-24 right-5 z-40 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-line bg-panel p-4 shadow-xl">
			<div className="flex items-center justify-between">
				<p className="text-md font-medium text-ink">{headline}</p>
				<button type="button" onClick={onClose} aria-label="Dismiss" className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-black/5">
					<Icon icon={IconX} size={14} />
				</button>
			</div>
			<ul className="mt-3 max-h-56 overflow-y-auto">
				{task.items.map((item) => {
					const icon = statusIcons[item.status];
					return (
						<li key={`${item.name}:${item.id}`} className="flex flex-row items-center gap-3 text-sm py-1.5">
							<span className={`block ${icon ? icon.className : ""}`}>
								{icon && <Icon icon={icon.icon} size={20} />}
							</span>
							<span className="min-w-0 flex-1 truncate text-ink">{item.name}</span>
							{item.status === "failed" && (
								<button type="button" onClick={() => onRetry(item.id)} aria-label={`Retry ${item.name}`} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink transition hover:bg-black/10">
									<Icon icon={IconRefresh} size={20} />
								</button>
							)}
							{item.status === "uploading" && <span className="shrink-0 text-muted">{Math.round((item.progress ?? 0) * 100)}%</span>}
							{item.status === "waiting" && <span className="shrink-0 text-muted">Queued</span>}
							{item.status === "skipped" && <span className="shrink-0 text-danger">Skipped</span>}
						</li>
					);
				})}
			</ul>
		</div>
	);
}

export default function GalleryChrome({ brand, storage, user }) {
	const pathname = usePathname();
	const router = useRouter();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [showUpload, setShowUpload] = useState(false);
	const [uploadTask, setUploadTask] = useState(null);
	const activeTitle = routeTitles[pathname] ?? "Media";

	useEffect(() => {
		if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
	}, []);

	useEffect(() => {
		if (!showUpload) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [showUpload]);

	const startUploadTask = async (files) => {
		setShowUpload(false);
		setUploadTask({
			items: files.map((file, index) => ({ id: index, file, name: file.name, size: file.size, status: "waiting", progress: 0 })),
			finished: false,
		});
		const patchItem = (index, fields) => setUploadTask((task) => task ? { ...task, items: task.items.map((item, i) => (i === index ? { ...item, ...fields } : item)) } : task);
		for (let index = 0; index < files.length; index += 1) {
			await runUploadAt(index, files[index], patchItem);
		}
		setUploadTask((task) => task ? { ...task, finished: true } : task);
		router.refresh();
	};

	const runUploadAt = async (index, file, patchItemArg) => {
		const patchItem = patchItemArg ?? ((i, fields) => setUploadTask((task) => task ? { ...task, items: task.items.map((item, j) => (j === i ? { ...item, ...fields } : item)) } : task));
		if (!file) return;
		patchItem(index, { status: "uploading", progress: 0 });
		try {
			const data = await uploadOne(file, (fraction) => patchItem(index, { progress: fraction }));
			patchItem(index, { status: data.uploaded > 0 ? "done" : "skipped", progress: 1 });
		} catch {
			patchItem(index, { status: "failed" });
		}
	};

	const retryUpload = async (index) => {
		const item = uploadTask?.items[index];
		if (!item) return;
		await runUploadAt(index, item.file);
		router.refresh();
	};

	return (
		<>
			<aside className={`fixed inset-y-0 left-0 z-50 flex w-75 max-w-[85vw] flex-col bg-panel px-3 py-4 shadow-2xl transition-transform duration-300 md:z-30 md:w-64 md:translate-x-0 md:shadow-none ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
				<button type="button" className="flex items-center gap-3 px-4 py-2 rounded-full font-medium text-ink hover:bg-black/5 md:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
					<Icon icon={IconMenu2} />
					<img src="/icon.png" alt="Logo" width={24} height={24} className="text-[#1F5194]" />
					<span className="truncate text-sm font-semibold tracking-tight text-ink">{brand}</span>
				</button>
				<Link href="/" className="hidden items-center gap-3 px-4 py-2 md:flex md:px-6 font-medium text-ink">
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
				<div className="mt-auto hidden px-2 pb-2 pt-4 md:block md:px-4">
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
					<UserMenu user={user} />
				</div>
			</header>

			<button className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center bg-ink text-white shadow-lg transition hover:bg-black hover:shadow-xl rounded-full" onClick={() => setShowUpload(true)} aria-label="Add photos">
				<Icon icon={IconCloudUpload} size={24} />
			</button>

			{showUpload && <UploadModal onClose={() => setShowUpload(false)} onSubmit={startUploadTask} />}
			{uploadTask && <UploadTray task={uploadTask} onClose={() => setUploadTask(null)} onRetry={retryUpload} />}
		</>
	);
}
