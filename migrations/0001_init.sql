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
