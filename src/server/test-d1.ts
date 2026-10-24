import { Database, type SQLQueryBindings } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(import.meta.dir, "../../migrations");

class Statement {
	constructor(
		readonly db: Database,
		readonly sql: string,
		readonly params: SQLQueryBindings[] = [],
	) {}

	bind(...params: SQLQueryBindings[]) {
		return new Statement(this.db, this.sql, params);
	}

	async first<T>() {
		return (this.db.query(this.sql).get(...this.params) as T | undefined) ?? null;
	}

	async all<T>() {
		return { results: this.db.query(this.sql).all(...this.params) as T[], success: true };
	}

	async run() {
		this.runSync();
		return { success: true };
	}

	runSync() {
		this.db.query(this.sql).run(...this.params);
	}
}

/**
 * Minimal in-memory stand-in for a D1 binding, backed by bun:sqlite, with the
 * project's migrations applied. Covers only the D1 surface the server uses.
 */
export function createTestD1(): D1Database {
	const db = new Database(":memory:");
	for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
		db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
	}
	return {
		prepare: (sql: string) => new Statement(db, sql),
		async batch(statements: Statement[]) {
			db.transaction(() => {
				for (const s of statements) s.runSync();
			})();
			return statements.map(() => ({ success: true }));
		},
	} as unknown as D1Database;
}
