import type { BibleStore, Passage, Proverb } from "./db.ts";
import { log } from "./log.ts";
import { getRandomInt } from "./random.ts";

export interface BibleConfig {
	store: BibleStore;
	authToken: string;
	fetchImpl?: typeof fetch;
}

interface EsvResponse {
	canonical: string;
	passages: string[];
	passage_meta?: {
		next_chapter?: number[];
		prev_chapter?: number[];
	}[];
}

// Number of verses per Proverbs chapter (chapter 31 truncated at v9 — the
// "wife of noble character" passage isn't aphoristic, so we exclude it).
const PROVERB_VERSE_COUNTS: Record<number, number> = {
	1: 33,
	2: 22,
	3: 35,
	4: 27,
	5: 23,
	6: 35,
	7: 27,
	8: 36,
	9: 18,
	10: 32,
	11: 31,
	12: 28,
	13: 25,
	14: 35,
	15: 33,
	16: 33,
	17: 28,
	18: 24,
	19: 28,
	20: 30,
	21: 31,
	22: 29,
	23: 35,
	24: 34,
	25: 28,
	26: 28,
	27: 27,
	28: 28,
	29: 27,
	30: 33,
	31: 9,
};

const ESV_API = "https://api.esv.org/v3/passage";

function pad2(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

export function buildProverbQuery(chapter: number, verse: number): string {
	return `200${pad2(chapter)}0${pad2(verse)}`;
}

export function pickRandomProverbRef(rng: () => number = Math.random): {
	chapter: number;
	verse: number;
	query: string;
} {
	const chapter = Math.floor(rng() * 31) + 1;
	const max = PROVERB_VERSE_COUNTS[chapter] ?? 1;
	const verse = Math.floor(rng() * max) + 1;
	return { chapter, verse, query: buildProverbQuery(chapter, verse) };
}

export function createBible(config: BibleConfig) {
	const { store, authToken } = config;
	const doFetch = config.fetchImpl ?? fetch;

	async function get(query: string): Promise<Passage> {
		const cached = store.findPassageByQuery(query);
		if (cached) {
			log.info(`found in db: ${cached.title}`);
			return cached;
		}

		const fetched = await fetchPassage(query);
		if (fetched) {
			store.savePassage(query, fetched);
			return fetched;
		}

		return {
			title: "Bible",
			text: `no results for: ${query}`,
			next: "/",
			prev: "/",
		};
	}

	async function fetchPassage(query: string): Promise<Passage | null> {
		log.info(`getting passage from ESV for: ${query}`);
		const url = `${ESV_API}/html/?q=${encodeURIComponent(
			query,
		)}&wrapping-div=true&div-classes=esv-text&include-footnotes=false&include-audio-link=false`;

		const data = await fetchEsv(url);
		if (!data || (data.canonical === "" && data.passages.length === 0)) {
			return null;
		}

		const meta = data.passage_meta?.[0];
		return {
			title: data.canonical,
			text: data.passages.join(" "),
			next: meta?.next_chapter ? meta.next_chapter.join("-") : "",
			prev: meta?.prev_chapter ? meta.prev_chapter.join("-") : "",
		};
	}

	async function getRandomProverb(rng: () => number = Math.random): Promise<Proverb | null> {
		const { query } = pickRandomProverbRef(rng);

		const cached = store.findProverbByQuery(query);
		if (cached) {
			log.info("found proverb in db");
			return cached;
		}

		const url = `${ESV_API}/text/?q=${encodeURIComponent(
			query,
		)}&include-passage-references=false&include-first-verse-numbers=false&include-verse-numbers=false&include-footnotes=false&include-footnote-body=false&include-passage-horizontal-lines=false&include-heading-horizontal-lines=false&include-headings=false&include-selahs=false&indent-paragraphs=0&indent-poetry=false&indent-poetry-lines=0&indent-psalm-doxology=0`;

		const data = await fetchEsv(url);
		if (!data || data.passages.length === 0) {
			log.err("proverb not found");
			return null;
		}

		const cleanText = data.passages
			.join(" ")
			.replace(/\n/g, " ")
			.replace(/\(ESV\)/g, "")
			.trim();

		const proverb: Proverb = {
			title: data.canonical,
			text: cleanText,
			query,
		};
		log.info(`saving to DB: ${proverb.title}`);
		store.saveProverb(proverb);
		return proverb;
	}

	async function fetchEsv(url: string): Promise<EsvResponse | null> {
		try {
			const res = await doFetch(url, {
				headers: { Accept: "application/json", Authorization: authToken },
			});
			if (!res.ok) {
				log.err(`ESV ${res.status}: ${res.statusText}`);
				return null;
			}
			return (await res.json()) as EsvResponse;
		} catch (err) {
			log.err(`ESV fetch failed: ${(err as Error).message}`);
			return null;
		}
	}

	return { get, getRandomProverb, getRandomInt };
}

export type Bible = ReturnType<typeof createBible>;
