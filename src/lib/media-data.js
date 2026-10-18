export const photosData = [
	{ id: 1, title: "Salt air", date: "Today", time: "4:03 PM", location: "Cape Kiwanda", type: "photo", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80" },
	{ id: 2, title: "Quiet morning", date: "Today", time: "9:47 AM", location: "Cannon Beach", type: "photo", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
	{ id: 3, title: "Tide lines", date: "Today", time: "10:12 AM", location: "Cape Kiwanda", type: "video", image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=80" },
	{ id: 4, title: "Pacific hush", date: "Yesterday", time: "7:30 PM", location: "Manzanita", type: "photo", image: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=800&q=80" },
	{ id: 5, title: "Low tide", date: "Yesterday", time: "6:15 PM", location: "Neskowin", type: "photo", image: "https://images.unsplash.com/photo-1502680390469-be75c86b6364?auto=format&fit=crop&w=800&q=80" },
	{ id: 6, title: "Blue hour", date: "Yesterday", time: "5:58 PM", location: "Pacific City", type: "photo", image: "https://images.unsplash.com/photo-1493552152660-f915ab47ae9d?auto=format&fit=crop&w=800&q=80" },
	{ id: 7, title: "Shorebreak", date: "Yesterday", time: "2:21 PM", location: "Cannon Beach", type: "photo", image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" },
	{ id: 8, title: "Golden field", date: "Oct 3, 2026", time: "5:40 PM", location: "Willamette Valley", type: "photo", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80" },
	{ id: 9, title: "Trailhead", date: "Oct 3, 2026", time: "8:05 AM", location: "Mount Hood", type: "photo", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80" },
	{ id: 10, title: "Alpine lake", date: "Oct 3, 2026", time: "11:32 AM", location: "Mount Hood", type: "photo", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80" },
	{ id: 11, title: "Fog line", date: "Oct 3, 2026", time: "9:12 AM", location: "Mount Hood", type: "photo", image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" },
	{ id: 12, title: "New growth", date: "Sep 18, 2026", time: "3:44 PM", location: "Portland", type: "photo", image: "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=800&q=80" },
	{ id: 13, title: "Forest path", date: "Sep 18, 2026", time: "2:50 PM", location: "Portland", type: "photo", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80" },
	{ id: 14, title: "Sea stack", date: "Sep 18, 2026", time: "12:08 PM", location: "Bandon", type: "photo", image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80" },
	{ id: 15, title: "Night sky", date: "Sep 2, 2026", time: "10:26 PM", location: "Willamette Valley", type: "photo", image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80" },
];

export const favorites = new Set([1, 5, 11]);
export const archivedIds = new Set([12, 14]);

export const albums = [
	{ name: "Weekend escapes", count: 42, cover: photosData[0].image },
	{ name: "Family archive", count: 128, cover: photosData[3].image },
	{ name: "Inspiration", count: 67, cover: photosData[10].image },
	{ name: "Coast line", count: 91, cover: photosData[6].image },
];

export function getPlaces(query = "") {
	const q = query.toLowerCase();
	return photosData.reduce((placeList, photo) => {
		if (q && !photo.location.toLowerCase().includes(q)) return placeList;
		const existing = placeList.find((place) => place.name === photo.location);
		if (existing) existing.count += 1;
		else placeList.push({ name: photo.location, cover: photo.image, count: 1 });
		return placeList;
	}, []);
}
