/** @type {import('next').NextConfig} */
const nextConfig = {
	/* config options here */
	cacheComponents: true,
	partialPrefetching: true,
	serverExternalPackages: ["better-sqlite3"],
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
