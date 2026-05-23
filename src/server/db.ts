import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface Passage {
	title: string;
	text: string;
	next: string;
	prev: string;
}

export interface Proverb {
	title: string;
	text: string;
	query: string;
}

export interface BibleStore {
	findPassageByQuery(query: string): Passage | null;
	savePassage(query: string, passage: Passage): void;
	findProverbByQuery(query: string): Proverb | null;
	saveProverb(proverb: Proverb): void;
	close(): void;
}

export function createStore(dbPath: string): BibleStore {
	if (dbPath !== ":memory:") {
		mkdirSync(dirname(dbPath), { recursive: true });
	}

	const db = new Database(dbPath);
	db.exec("PRAGMA journal_mode = WAL");

	db.exec(`
		CREATE TABLE IF NOT EXISTS passages (
			title TEXT PRIMARY KEY,
			text  TEXT NOT NULL,
			next  TEXT NOT NULL DEFAULT '',
			prev  TEXT NOT NULL DEFAULT '',
			views INTEGER NOT NULL DEFAULT 1
		);
		CREATE TABLE IF NOT EXISTS passage_queries (
			query TEXT PRIMARY KEY,
			title TEXT NOT NULL REFERENCES passages(title) ON DELETE CASCADE
		);
		CREATE INDEX IF NOT EXISTS idx_passage_queries_title ON passage_queries(title);
		CREATE TABLE IF NOT EXISTS proverbs (
			query TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			text  TEXT NOT NULL
		);
	`);

	const selectPassageByQuery = db.query<Passage, [string]>(`
		SELECT p.title, p.text, p.next, p.prev
		FROM passages p
		JOIN passage_queries q ON q.title = p.title
		WHERE q.query = ?
	`);
	const selectPassageByTitle = db.query<{ title: string }, [string]>(
		"SELECT title FROM passages WHERE title = ?",
	);
	const insertPassage = db.prepare(
		"INSERT INTO passages (title, text, next, prev) VALUES (?, ?, ?, ?)",
	);
	const insertQuery = db.prepare(
		"INSERT OR IGNORE INTO passage_queries (query, title) VALUES (?, ?)",
	);
	const incrementViews = db.prepare("UPDATE passages SET views = views + 1 WHERE title = ?");

	const selectProverbByQuery = db.query<Proverb, [string]>(
		"SELECT title, text, query FROM proverbs WHERE query = ?",
	);
	const insertProverb = db.prepare(
		"INSERT OR REPLACE INTO proverbs (query, title, text) VALUES (?, ?, ?)",
	);

	return {
		findPassageByQuery(query) {
			return selectPassageByQuery.get(query) ?? null;
		},

		savePassage(query, passage) {
			const existing = selectPassageByTitle.get(passage.title);
			if (existing) {
				insertQuery.run(query, passage.title);
				incrementViews.run(passage.title);
				return;
			}
			db.transaction(() => {
				insertPassage.run(passage.title, passage.text, passage.next, passage.prev);
				insertQuery.run(passage.title, passage.title);
				if (query !== passage.title) insertQuery.run(query, passage.title);
			})();
		},

		findProverbByQuery(query) {
			return selectProverbByQuery.get(query) ?? null;
		},

		saveProverb(proverb) {
			insertProverb.run(proverb.query, proverb.title, proverb.text);
		},

		close() {
			db.close();
		},
	};
}
