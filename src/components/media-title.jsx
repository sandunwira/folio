import UserMenu from "@/components/user-menu";

export function toPublicUser(user) {
	return user ? { name: user.name, username: user.username, isAdmin: !!user.isAdmin } : { name: "", username: "", isAdmin: false };
}

export default function MediaTitle({ title, count, user }) {
	return (
		<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
			<h1 className="hidden text-[22px] font-medium md:block">{title}</h1>
			<p className="text-xs text-muted md:hidden">{count} items</p>
			<UserMenu user={user} className="shrink-0 hidden md:block" />
		</div>
	);
}
