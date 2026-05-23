import { type DBSchema, type IDBPDatabase, openDB } from "idb";

export interface Highlight {
	id: string;
	passageTitle: string;
	start: number;
	end: number;
	text: string;
	note: string;
	createdAt: number;
	updatedAt: number;
}

interface HighlightsDB extends DBSchema {
	highlights: {
		key: string;
		value: Highlight;
		indexes: { "by-passage": string };
	};
}

const DB_NAME = "bible";
const STORE = "highlights";
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase<HighlightsDB>> | null = null;

function getDB(): Promise<IDBPDatabase<HighlightsDB>> {
	if (!dbPromise) {
		dbPromise = openDB<HighlightsDB>(DB_NAME, VERSION, {
			upgrade(db) {
				const store = db.createObjectStore(STORE, { keyPath: "id" });
				store.createIndex("by-passage", "passageTitle");
			},
		});
	}
	return dbPromise;
}

export interface NewHighlightInput {
	passageTitle: string;
	start: number;
	end: number;
	text: string;
	note?: string;
}

function newId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
	return `h_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function addHighlight(input: NewHighlightInput): Promise<Highlight> {
	const now = Date.now();
	const highlight: Highlight = {
		id: newId(),
		passageTitle: input.passageTitle,
		start: input.start,
		end: input.end,
		text: input.text,
		note: input.note ?? "",
		createdAt: now,
		updatedAt: now,
	};
	const db = await getDB();
	await db.put(STORE, highlight);
	return highlight;
}

export async function getHighlights(passageTitle: string): Promise<Highlight[]> {
	const db = await getDB();
	const rows = await db.getAllFromIndex(STORE, "by-passage", passageTitle);
	return rows.sort((a, b) => a.start - b.start);
}

export async function updateHighlight(
	id: string,
	updates: Partial<Pick<Highlight, "note">>,
): Promise<Highlight | null> {
	const db = await getDB();
	const existing = await db.get(STORE, id);
	if (!existing) return null;
	const next: Highlight = {
		...existing,
		...updates,
		updatedAt: Date.now(),
	};
	await db.put(STORE, next);
	return next;
}

export async function deleteHighlight(id: string): Promise<void> {
	const db = await getDB();
	await db.delete(STORE, id);
}

// Test-only helper. Allows tests to inject a mock IDB implementation.
export function __setDbForTests(promise: Promise<IDBPDatabase<HighlightsDB>> | null): void {
	dbPromise = promise;
}
