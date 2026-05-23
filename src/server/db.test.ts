import { describe, expect, test } from "bun:test";
import { createStore } from "./db.ts";

function newStore() {
	return createStore(":memory:");
}

describe("db store", () => {
	test("returns null for an unknown passage", () => {
		const store = newStore();
		expect(store.findPassageByQuery("nope")).toBeNull();
		store.close();
	});

	test("savePassage round-trips by canonical title", () => {
		const store = newStore();
		store.savePassage("jn 3.16", {
			title: "John 3:16",
			text: "For God so loved...",
			next: "John 4",
			prev: "John 3:15",
		});
		const found = store.findPassageByQuery("jn 3.16");
		expect(found?.title).toBe("John 3:16");
		expect(found?.text).toBe("For God so loved...");
		store.close();
	});

	test("savePassage indexes the canonical title as a query", () => {
		const store = newStore();
		store.savePassage("jn 3.16", {
			title: "John 3:16",
			text: "...",
			next: "",
			prev: "",
		});
		const byTitle = store.findPassageByQuery("John 3:16");
		expect(byTitle?.title).toBe("John 3:16");
		store.close();
	});

	test("savePassage adds new query aliases to an existing passage", () => {
		const store = newStore();
		store.savePassage("John 3:16", {
			title: "John 3:16",
			text: "...",
			next: "",
			prev: "",
		});
		store.savePassage("john3.16", {
			title: "John 3:16",
			text: "...",
			next: "",
			prev: "",
		});
		expect(store.findPassageByQuery("john3.16")?.title).toBe("John 3:16");
		store.close();
	});

	test("findPassageByQuery is case-sensitive (caller normalises)", () => {
		const store = newStore();
		store.savePassage("John 3:16", {
			title: "John 3:16",
			text: "...",
			next: "",
			prev: "",
		});
		expect(store.findPassageByQuery("john 3:16")).toBeNull();
		store.close();
	});

	test("proverbs round-trip on query", () => {
		const store = newStore();
		store.saveProverb({
			query: "20010001",
			title: "Proverbs 1:1",
			text: "The proverbs of Solomon",
		});
		const got = store.findProverbByQuery("20010001");
		expect(got?.title).toBe("Proverbs 1:1");
		expect(got?.text).toMatch(/Solomon/);
		store.close();
	});

	test("saveProverb overwrites an existing entry", () => {
		const store = newStore();
		store.saveProverb({ query: "q", title: "T1", text: "x" });
		store.saveProverb({ query: "q", title: "T2", text: "y" });
		expect(store.findProverbByQuery("q")?.title).toBe("T2");
		store.close();
	});
});
