/** @type {import('next').NextConfig} */
const nextConfig = {
	/* config options here */
	cacheComponents: true,
	partialPrefetching: true,
	experimental: {
		serverActions: {
			bodySizeLimit: "500mb",
		},
	},
	serverExternalPackages: ["better-sqlite3", "sharp", "heic-convert", "archiver", "adm-zip"],
	turbopack: {
		rules: {
			"*.css": {
				loaders: ["@tailwindcss/turbopack"],
				as: "*.css",
			},
		},
	},
};

export default nextConfig;
