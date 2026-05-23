const KEY = "recent";
const LIMIT = 8;

export function readRecent(): string[] {
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as string[]) : [];
	} catch {
		return [];
	}
}

export function pushRecent(title: string): string[] {
	if (!title || title === "Bible") return readRecent();
	const list = readRecent().filter((t) => t !== title);
	list.unshift(title);
	if (list.length > LIMIT) list.length = LIMIT;
	try {
		localStorage.setItem(KEY, JSON.stringify(list));
	} catch {
		/* ignore */
	}
	return list;
}

export function searchFriendly(query: string): string {
	return query.toLowerCase().replace(/\s+/g, "");
}
