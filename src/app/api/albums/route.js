import { getSessionUser, listAlbums } from "@/lib/auth";

export async function GET() {
	const user = await getSessionUser();
	if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
	const albums = listAlbums(user.id).map((album) => ({
		id: album.id,
		name: album.name,
		count: album.item_count,
		cover: album.cover_media_id ? `/api/media/${album.cover_media_id}` : null,
	}));
	return Response.json({ albums }, { headers: { "Cache-Control": "private, no-store" } });
}
