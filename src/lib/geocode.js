const placeCache = new Map();

export async function estimateLocation(latitude, longitude) {
	const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
	if (placeCache.has(key)) return placeCache.get(key);
	let est = null;
	try {
		const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&zoom=10&accept-language=en`, {
			headers: { "User-Agent": "Folio/0.1 (self-hosted photo archive)", Accept: "application/json" },
			signal: AbortSignal.timeout(6000),
		});
		if (response.ok) {
			const data = await response.json();
			const address = data.address ?? {};
			est = {
				location: data.display_name ?? null,
				city: address.city ?? null,
				district: address.state_district ?? null,
				state: address.state ?? null,
				country: address.country ?? null,
			};
		}
	} catch {
		est = null;
	}
	placeCache.set(key, est);
	if (placeCache.size > 300) placeCache.delete(placeCache.keys().next().value);
	return est;
}
