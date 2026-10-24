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
	findPassageByQuery(query: string): Promise<Passage | null>;
	savePassage(query: string, passage: Passage): Promise<void>;
	findProverbByQuery(query: string): Promise<Proverb | null>;
	saveProverb(proverb: Proverb): Promise<void>;
}

// Schema lives in migrations/ and is applied with `wrangler d1 migrations apply`.
export function createStore(db: D1Database): BibleStore {
	const insertQuery = (query: string, title: string) =>
		db
			.prepare("INSERT OR IGNORE INTO passage_queries (query, title) VALUES (?, ?)")
			.bind(query, title);

	return {
		async findPassageByQuery(query) {
			return db
				.prepare(
					`SELECT p.title, p.text, p.next, p.prev
					FROM passages p
					JOIN passage_queries q ON q.title = p.title
					WHERE q.query = ?`,
				)
				.bind(query)
				.first<Passage>();
		},
		async savePassage(query, passage) {
			const existing = await db
				.prepare("SELECT title FROM passages WHERE title = ?")
				.bind(passage.title)
				.first<{ title: string }>();
			if (existing) {
				await db.batch([
					insertQuery(query, passage.title),
					db.prepare("UPDATE passages SET views = views + 1 WHERE title = ?").bind(passage.title),
				]);
				return;
			}
			// batch() runs as a single transaction.
			const statements = [
				db
					.prepare("INSERT INTO passages (title, text, next, prev) VALUES (?, ?, ?, ?)")
					.bind(passage.title, passage.text, passage.next, passage.prev),
				insertQuery(passage.title, passage.title),
			];
			if (query !== passage.title) statements.push(insertQuery(query, passage.title));
			await db.batch(statements);
		},
		async findProverbByQuery(query) {
			return db
				.prepare("SELECT title, text, query FROM proverbs WHERE query = ?")
				.bind(query)
				.first<Proverb>();
		},
		async saveProverb(proverb) {
			await db
				.prepare("INSERT OR REPLACE INTO proverbs (query, title, text) VALUES (?, ?, ?)")
				.bind(proverb.query, proverb.title, proverb.text)
				.run();
		},
	};
}
