"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHistory, IconLayoutDashboard, IconSettings, IconUsers } from "@tabler/icons-react";

const items = [
	{ href: "/dashboard", label: "Overview", icon: IconLayoutDashboard },
	{ href: "/dashboard/users", label: "Users", icon: IconUsers },
	{ href: "/dashboard/logs", label: "Logs", icon: IconHistory },
	{ href: "/settings", label: "Site settings", icon: IconSettings },
];

export default function AdminNav() {
	const pathname = usePathname();

	return (
		<div className="flex flex-col gap-1 px-2 md:px-4">
			{items.map(({ href, label, icon: IconComponent }) => {
				const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
				return (
					<Link key={href} href={href} className={`flex shrink-0 items-center gap-4 rounded-full px-4 py-2.5 text-sm transition md:px-6 ${active ? "bg-accent-soft font-medium text-ink" : "text-ink hover:bg-black/5"}`}>
						<IconComponent size={20} stroke={1.8} aria-hidden="true" />
						{label}
					</Link>
				);
			})}
		</div>
	);
}
