import "./globals.css";

export const metadata = {
	title: "folio | Your personal archive",
	description: "A quiet home for all your photos and videos.",
	manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }) {
	return (
		<html
			lang="en"
			className={`h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">{children}</body>
		</html>
	);
}
