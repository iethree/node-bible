import "../test-setup.ts";
import { beforeEach, describe, expect, test } from "bun:test";
import { IDBFactory } from "fake-indexeddb";
import {
	__setDbForTests,
	addHighlight,
	deleteHighlight,
	getHighlights,
	updateHighlight,
} from "./highlights.ts";

beforeEach(() => {
	// Fresh IDB instance + clear cached db promise so each test starts clean.
	globalThis.indexedDB = new IDBFactory();
	__setDbForTests(null);
});

describe("addHighlight", () => {
	test("persists a new highlight with generated id and timestamps", async () => {
		const before = Date.now();
		const h = await addHighlight({
			passageTitle: "John 3:16",
			start: 4,
			end: 10,
			text: "God so",
		});
		expect(h.id).toMatch(/.+/);
		expect(h.note).toBe("");
		expect(h.createdAt).toBeGreaterThanOrEqual(before);
		expect(h.updatedAt).toBe(h.createdAt);

		const found = await getHighlights("John 3:16");
		expect(found).toHaveLength(1);
		expect(found[0]?.id).toBe(h.id);
	});

	test("stores the provided note", async () => {
		const h = await addHighlight({
			passageTitle: "John 3:16",
			start: 0,
			end: 3,
			text: "For",
			note: "memorize this",
		});
		expect(h.note).toBe("memorize this");
	});
});

describe("getHighlights", () => {
	test("returns rows for the passage sorted by start offset", async () => {
		await addHighlight({ passageTitle: "Ps 23:1", start: 20, end: 25, text: "x" });
		await addHighlight({ passageTitle: "Ps 23:1", start: 0, end: 5, text: "y" });
		await addHighlight({ passageTitle: "Ps 23:1", start: 10, end: 15, text: "z" });

		const rows = await getHighlights("Ps 23:1");
		expect(rows.map((r) => r.start)).toEqual([0, 10, 20]);
	});

	test("scopes results to the given passage", async () => {
		await addHighlight({ passageTitle: "John 3:16", start: 0, end: 3, text: "A" });
		await addHighlight({ passageTitle: "Ps 23:1", start: 0, end: 3, text: "B" });

		const john = await getHighlights("John 3:16");
		const ps = await getHighlights("Ps 23:1");
		expect(john).toHaveLength(1);
		expect(ps).toHaveLength(1);
		expect(john[0]?.text).toBe("A");
		expect(ps[0]?.text).toBe("B");
	});

	test("returns an empty array when nothing has been stored", async () => {
		const rows = await getHighlights("Unknown 1:1");
		expect(rows).toEqual([]);
	});
});

describe("updateHighlight", () => {
	test("changes the note and bumps updatedAt", async () => {
		const original = await addHighlight({
			passageTitle: "John 3:16",
			start: 0,
			end: 3,
			text: "For",
		});
		// Wait a tick so updatedAt is observably larger.
		await new Promise((r) => setTimeout(r, 5));

		const updated = await updateHighlight(original.id, { note: "new note" });
		expect(updated).not.toBeNull();
		expect(updated?.note).toBe("new note");
		expect(updated?.createdAt).toBe(original.createdAt);
		expect(updated?.updatedAt).toBeGreaterThan(original.createdAt);

		const [reloaded] = await getHighlights("John 3:16");
		expect(reloaded?.note).toBe("new note");
	});

	test("returns null for an unknown id", async () => {
		expect(await updateHighlight("nope", { note: "x" })).toBeNull();
	});
});

describe("deleteHighlight", () => {
	test("removes the row", async () => {
		const h = await addHighlight({
			passageTitle: "John 3:16",
			start: 0,
			end: 3,
			text: "For",
		});
		await deleteHighlight(h.id);
		expect(await getHighlights("John 3:16")).toEqual([]);
	});

	test("is a no-op for an unknown id", async () => {
		// Should not throw.
		await deleteHighlight("does-not-exist");
	});
});
