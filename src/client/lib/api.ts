export interface Passage {
	title: string;
	text: string;
	next: string;
	prev: string;
}

export function passageKey(query: string): string {
	return `/api/${encodeURIComponent(query)}`;
}

export async function fetcher(url: string): Promise<Passage> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	return (await res.json()) as Passage;
}
