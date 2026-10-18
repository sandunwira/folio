import { Poppins } from 'next/font/google';
import "./globals.css";

const poppins = Poppins({
	subsets: ["latin"],
	weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
	display: "swap",
});

export const metadata = {
	title: "Folio | Your personal archive",
	description: "A quiet home for all your photos and videos.",
	manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }) {
	return (
		<html
			lang="en"
			className={`h-full antialiased ${poppins.className}`}
		>
			<body className="min-h-full flex flex-col">{children}</body>
		</html>
	);
}
