# folio

folio is a quiet, web-first media archive for browsing photos and videos. It is inspired by self-hosted media managers such as Immich, with a focused gallery experience, responsive navigation, and installable PWA support.

The current version is a polished frontend prototype. It uses curated remote image assets to demonstrate the experience; uploads, accounts, storage, and media persistence are not connected to a backend yet.

## Features

- Responsive media archive for desktop and mobile
- Library, albums, favorites, and archive navigation
- Search by media title and location
- Featured memory section and recent media gallery
- Color-preserved photo and video previews
- Video labels and collection markers
- Full-screen media preview
- Upload flow UI for photos and videos
- Installable PWA manifest and service worker shell
- Tailwind CSS utility styling

## Getting started

### Requirements

- Node.js 20 or newer
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |

## PWA support

PWA assets live in `public/`:

- `manifest.webmanifest` defines the folio app identity and standalone display mode.
- `icon.png` provides the install icon.
- `sw.js` caches the app shell and same-origin requests for repeat visits.

The service worker is registered from the client page. Service workers require a secure origin in production; `localhost` is supported during local development.

## Project structure

```text
src/app/
 page.js       # folio archive interface and client interactions
 layout.js     # document metadata and root layout
 globals.css   # Tailwind import
public/
 manifest.webmanifest
 icon.png
 sw.js
```

## Current scope

folio currently focuses on the visual and interaction layer. A future backend can connect the existing search, navigation, preview, and upload surfaces to real media records, authentication, storage, metadata, and background synchronization.

## Validation

Before shipping changes, run:

```bash
npm run lint
npm run build
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
