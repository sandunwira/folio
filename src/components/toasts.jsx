"use client";

import { Toaster } from "react-hot-toast";

export default function Toasts() {
	return (
		<Toaster
			position="bottom-center"
			containerStyle={{ bottom: 96 }}
			toastOptions={{
				style: {
					borderRadius: "9999px",
					background: "var(--color-ink, #1a1a1a)",
					color: "#fff",
					fontSize: "12px",
					fontWeight: 500,
					padding: "8px 16px",
					boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.25)",
				},
				duration: 2500,
			}}
		/>
	);
}
