"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IconDownload, IconTrash, IconUpload, IconUserOff } from "@tabler/icons-react";
import Icon from "@/components/icon";

export default function DangerZone({ deactivateSelfAction, deleteSelfAction, clearPersonalDataAction, importPersonalDataAction, isLastAdmin, hasData }) {
	const IMPORT_SIZE_LIMIT = 500 * 1024 * 1024;
	const [modal, setModal] = useState(null);
	const [error, setError] = useState(null);
	const [oversizeFile, setOversizeFile] = useState(null);
	const [importFile, setImportFile] = useState(null);
	const [pending, start] = useTransition();
	const router = useRouter();

	const pickImportFile = (file) => {
		if (!file) return;
		if (file.size > IMPORT_SIZE_LIMIT) {
			setImportFile(null);
			setOversizeFile(file);
			setModal("oversize");
			return;
		}
		setError(null);
		setImportFile(file);
	};

	const open = (name) => {
		setError(null);
		setModal(name);
	};

	const close = () => {
		setModal(null);
		setError(null);
		setImportFile(null);
		setOversizeFile(null);
	};

	const deactivate = () => {
		start(async () => {
			const result = await deactivateSelfAction();
			if (result?.error) {
				setError(result.error);
				return;
			}
			router.push("/");
		});
	};

	const deleteSelf = () => {
		start(async () => {
			await deleteSelfAction();
		});
	};

	const clearAll = () => {
		start(async () => {
			const result = await clearPersonalDataAction();
			if (result?.error) {
				setError(result.error);
				return;
			}
			toast.success(`Cleared ${result.count} item${result.count === 1 ? "" : "s"} from your archive.`);
			close();
		});
	};

	const importData = (formData) => {
		start(async () => {
			const result = await importPersonalDataAction(formData);
			if (result?.error) {
				setError(result.error);
				return;
			}
			toast.success(`Imported ${result.count} item${result.count === 1 ? "" : "s"}${result.albums ? ` into ${result.albums} new album${result.albums === 1 ? "" : "s"}` : ""}.`);
			close();
		});
	};

	return (
		<>
			<section className="rounded-3xl border border-line bg-panel">
				<div className="border-b border-line px-6 py-4">
					<h2 className="text-base font-medium">Danger Zone</h2>
					<p className="mt-1 text-xs text-muted">Irreversible and destructive actions on your own account.</p>
				</div>
				<ul className="divide-y divide-line">
					<li className="flex flex-wrap items-center gap-3 px-6 py-4">
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">Deactivate my account</p>
							<p className="mt-0.5 text-xs text-muted">You are signed out and an admin must re-activate your account before you can sign in again.</p>
						</div>
						<button type="button" disabled={isLastAdmin} title={isLastAdmin ? "Cannot deactivate the last active admin" : undefined} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-panel px-4 text-xs font-medium text-[#c5221f] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:text-faint" onClick={() => open("deactivate")}>
							<Icon icon={IconUserOff} size={14} /> Deactivate
						</button>
					</li>
					<li className="flex flex-wrap items-center gap-3 px-6 py-4">
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">Delete my account</p>
							<p className="mt-0.5 text-xs text-muted">Your account, albums, and media metadata are removed permanently and you are signed out. This cannot be undone.</p>
						</div>
						<button type="button" disabled={isLastAdmin} title={isLastAdmin ? "Cannot delete the last admin" : undefined} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-panel px-4 text-xs font-medium text-[#c5221f] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:text-faint" onClick={() => open("delete")}>
							<Icon icon={IconTrash} size={14} /> Delete
						</button>
					</li>
					<li className="flex flex-wrap items-center gap-3 px-6 py-4">
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">Clear all my data</p>
							<p className="mt-0.5 text-xs text-muted">Deletes every item in your archive — media files on disk and their metadata — plus your albums. The account itself stays.</p>
						</div>
						<button type="button" disabled={!hasData} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-panel px-4 text-xs font-medium text-[#c5221f] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:text-faint" onClick={() => open("clear")}>
							<Icon icon={IconTrash} size={14} /> Clear data
						</button>
					</li>
					<li className="flex flex-wrap items-center gap-3 px-6 py-4">
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">Export / import my data</p>
							<p className="mt-0.5 text-xs text-muted">Download your archive metadata (items and albums) as JSON, with export files you can re-import later.</p>
						</div>
						<button type="button" className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-panel px-4 text-xs font-medium text-ink transition hover:bg-black/5" onClick={() => open("transfer")}>
							<Icon icon={IconDownload} size={14} /> Export / import
						</button>
					</li>
				</ul>
			</section>

			{modal && (
				<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5" onClick={close}>
					<div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-6" onClick={(event) => event.stopPropagation()}>
						{modal === "clear" && (
							<>
								<h2 className="text-lg font-medium">Clear all your data?</h2>
								<p className="mt-1 text-xs text-muted">Every item in your archive is permanently deleted — uploaded files, their metadata, and your albums. Your account and its settings stay. This cannot be undone.</p>
								{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
								<div className="mt-5 flex justify-end gap-3">
									<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={close}>
										Cancel
									</button>
									<button type="button" disabled={pending} className="h-10 rounded-full bg-danger px-5 text-sm font-medium text-white transition hover:bg-[#b3261e] disabled:opacity-60" onClick={clearAll}>
										Clear my data
									</button>
								</div>
							</>
						)}
						{modal === "oversize" && (
							<>
								<h2 className="text-lg font-medium">Data file too large</h2>
								<p className="mt-1 text-xs text-muted">
									Your data file is {(oversizeFile.size / (1024 * 1024)).toFixed(1)} MB, which is over the {(IMPORT_SIZE_LIMIT / (1024 * 1024)).toFixed(0)} MB import limit. To move these files, upload them yourself with the upload button on the Media page — then export a fresh copy if you need one, since uploads made that way are included in the next export.
								</p>
								<div className="mt-5 flex justify-end gap-3">
									<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={close}>
										Got it
									</button>
									<button type="button" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black" onClick={() => { close(); router.push("/"); }}>
										<Icon icon={IconUpload} size={16} /> Go to Media
									</button>
								</div>
							</>
						)}
						{modal === "transfer" && (
							<>
								<h2 className="text-lg font-medium">Export / import my data</h2>
								<p className="mt-1 text-xs text-muted">Download a ZIP of your account&rsquo;s data — media metadata, albums, and every uploaded file. Upload a previously downloaded export to fully restore items into this or another Folio account.</p>
								<div className="mt-4 flex flex-wrap items-center gap-2">
									<a href="/api/my/export" download className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black">
										<Icon icon={IconDownload} size={16} /> Download my data
									</a>
								</div>
								<form className="mt-3">
									<input type="file" name="data" accept="application/zip,.zip" onChange={(event) => pickImportFile(event.target.files?.[0] ?? null)} className="block w-full cursor-pointer rounded-xl border border-line bg-surface px-3 py-2 text-xs text-muted file:mr-3 file:cursor-pointer file:border-0 file:rounded-full file:bg-ink file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-white" />
									<div className="mt-3 flex justify-end gap-3">
										<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={close}>
											Close
										</button>
										<button type="button" disabled={pending || !importFile} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60" onClick={() => { const formData = new FormData(); formData.set("data", importFile); importData(formData); }}>
											<Icon icon={IconUpload} size={16} /> Import data
										</button>
									</div>
								</form>
								{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
							</>
						)}
						{modal === "deactivate" && (
							<>
								<h2 className="text-lg font-medium">Deactivate your account?</h2>
								<p className="mt-1 text-xs text-muted">You are signed out immediately and cannot sign in again until an admin re-activates your account.</p>
								{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
								<div className="mt-5 flex justify-end gap-3">
									<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={close}>
										Cancel
									</button>
									<button type="button" disabled={pending} className="h-10 rounded-full bg-danger px-5 text-sm font-medium text-white transition hover:bg-[#b3261e] disabled:opacity-60" onClick={deactivate}>
										Deactivate my account
									</button>
								</div>
							</>
						)}
						{modal === "delete" && (
							<>
								<h2 className="text-lg font-medium">Delete your account?</h2>
								<p className="mt-1 text-xs text-muted">Your account, albums, and media metadata are permanently removed and all your sessions are signed out. This cannot be undone.</p>
								{error && <p className="mt-3 rounded-lg bg-[#fbeaea] px-3 py-2 text-xs text-[#c5221f]">{error}</p>}
								<div className="mt-5 flex justify-end gap-3">
									<button type="button" className="h-10 rounded-full px-5 text-sm font-medium text-ink transition hover:bg-black/5" onClick={close}>
										Cancel
									</button>
									<button type="button" disabled={pending} className="h-10 rounded-full bg-danger px-5 text-sm font-medium text-white transition hover:bg-[#b3261e] disabled:opacity-60" onClick={deleteSelf}>
										Delete my account
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</>
	);
}
