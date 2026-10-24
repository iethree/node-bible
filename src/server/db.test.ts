import { describe, expect, test } from "bun:test";
import { createStore } from "./db.ts";
import { createTestD1 } from "./test-d1.ts";

function newStore() {
	return createStore(createTestD1());
}

describe("db store", () => {
	test("returns null for an unknown passage", async () => {
		const store = newStore();
		expect(await store.findPassageByQuery("nope")).toBeNull();
	});

	test("savePassage round-trips by canonical title", async () => {
		const store = newStore();
		await store.savePassage("jn 3.16", {
			title: "John 3:16",
			text: "For God so loved...",
			next: "John 4",
			prev: "John 3:15",
		});
		const found = await store.findPassageByQuery("jn 3.16");
		expect(found?.title).toBe("John 3:16");
		expect(found?.text).toBe("For God so loved...");
	});

	test("savePassage indexes the canonical title as a query", async () => {
		const store = newStore();
		await store.savePassage("jn 3.16", {
			title: "John 3:16",
			text: "...",
			next: "",
			prev: "",
		});
		const byTitle = await store.findPassageByQuery("John 3:16");
		expect(byTitle?.title).toBe("John 3:16");
	});

	test("savePassage adds new query aliases to an existing passage", async () => {
		const store = newStore();
		await store.savePassage("John 3:16", {
			title: "John 3:16",
			text: "...",
			next: "",
			prev: "",
		});
		await store.savePassage("john3.16", {
			title: "John 3:16",
			text: "...",
			next: "",
			prev: "",
		});
		expect((await store.findPassageByQuery("john3.16"))?.title).toBe("John 3:16");
	});

	test("findPassageByQuery is case-sensitive (caller normalises)", async () => {
		const store = newStore();
		await store.savePassage("John 3:16", {
			title: "John 3:16",
			text: "...",
			next: "",
			prev: "",
		});
		expect(await store.findPassageByQuery("john 3:16")).toBeNull();
	});

	test("proverbs round-trip on query", async () => {
		const store = newStore();
		await store.saveProverb({
			query: "20010001",
			title: "Proverbs 1:1",
			text: "The proverbs of Solomon",
		});
		const got = await store.findProverbByQuery("20010001");
		expect(got?.title).toBe("Proverbs 1:1");
		expect(got?.text).toMatch(/Solomon/);
	});

	test("saveProverb overwrites an existing entry", async () => {
		const store = newStore();
		await store.saveProverb({ query: "q", title: "T1", text: "x" });
		await store.saveProverb({ query: "q", title: "T2", text: "y" });
		expect((await store.findProverbByQuery("q"))?.title).toBe("T2");
	});
});
