import { describe, expect, mock, test } from "bun:test";
import { buildProverbQuery, createBible, pickRandomProverbRef } from "./bible.ts";
import { createStore } from "./db.ts";

function fakeFetch(body: object, ok = true) {
	return mock(async () => ({
		ok,
		status: ok ? 200 : 500,
		statusText: ok ? "OK" : "Error",
		json: async () => body,
	})) as unknown as typeof fetch;
}

function bombFetch() {
	return mock(async () => {
		throw new Error("network down");
	}) as unknown as typeof fetch;
}

describe("buildProverbQuery", () => {
	test("zero-pads chapter and verse", () => {
		expect(buildProverbQuery(1, 1)).toBe("20001001");
		expect(buildProverbQuery(31, 9)).toBe("20031009");
		expect(buildProverbQuery(10, 22)).toBe("20010022");
	});
});

describe("pickRandomProverbRef", () => {
	test("respects chapter range and per-chapter verse caps", () => {
		for (let r = 0; r < 1; r += 0.05) {
			const ref = pickRandomProverbRef(() => r);
			expect(ref.chapter).toBeGreaterThanOrEqual(1);
			expect(ref.chapter).toBeLessThanOrEqual(31);
			expect(ref.verse).toBeGreaterThanOrEqual(1);
			expect(ref.query).toMatch(/^200\d{2}0\d{2}$/);
		}
	});

	test("with rng=0 returns chapter 1 verse 1", () => {
		const ref = pickRandomProverbRef(() => 0);
		expect(ref.chapter).toBe(1);
		expect(ref.verse).toBe(1);
		expect(ref.query).toBe("20001001");
	});
});

describe("bible.get", () => {
	test("returns cached passage without hitting fetch", async () => {
		const store = createStore(":memory:");
		store.savePassage("jn 3.16", {
			title: "John 3:16",
			text: "cached text",
			next: "",
			prev: "",
		});
		const fetchImpl = bombFetch();
		const bible = createBible({ store, authToken: "x", fetchImpl });
		const result = await bible.get("jn 3.16");
		expect(result.title).toBe("John 3:16");
		expect(result.text).toBe("cached text");
		expect(fetchImpl).not.toHaveBeenCalled();
		store.close();
	});

	test("falls through to ESV on cache miss and stores the result", async () => {
		const store = createStore(":memory:");
		const fetchImpl = fakeFetch({
			canonical: "John 3:16",
			passages: ["<p>For God so loved</p>"],
			passage_meta: [{ next_chapter: [43, 4, 1], prev_chapter: [43, 3, 1] }],
		});
		const bible = createBible({ store, authToken: "x", fetchImpl });
		const result = await bible.get("jn 3.16");
		expect(result.title).toBe("John 3:16");
		expect(result.text).toContain("For God so loved");
		expect(result.next).toBe("43-4-1");
		expect(result.prev).toBe("43-3-1");

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(store.findPassageByQuery("jn 3.16")?.title).toBe("John 3:16");

		// Second call should hit the cache.
		await bible.get("jn 3.16");
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		store.close();
	});

	test("returns sentinel when ESV returns an empty result", async () => {
		const store = createStore(":memory:");
		const fetchImpl = fakeFetch({ canonical: "", passages: [], passage_meta: [] });
		const bible = createBible({ store, authToken: "x", fetchImpl });
		const result = await bible.get("zzz");
		expect(result.title).toBe("Bible");
		expect(result.text).toContain("no results for: zzz");
		store.close();
	});

	test("returns sentinel when fetch throws", async () => {
		const store = createStore(":memory:");
		const bible = createBible({ store, authToken: "x", fetchImpl: bombFetch() });
		const result = await bible.get("jn 3.16");
		expect(result.title).toBe("Bible");
		expect(result.text).toContain("no results");
		store.close();
	});

	test("returns sentinel when fetch returns non-ok", async () => {
		const store = createStore(":memory:");
		const bible = createBible({
			store,
			authToken: "x",
			fetchImpl: fakeFetch({}, false),
		});
		const result = await bible.get("jn 3.16");
		expect(result.title).toBe("Bible");
		store.close();
	});

	test("sends Authorization header to ESV", async () => {
		const store = createStore(":memory:");
		const fetchImpl = fakeFetch({
			canonical: "John 1:1",
			passages: ["x"],
			passage_meta: [{}],
		});
		const bible = createBible({ store, authToken: "secret-token", fetchImpl });
		await bible.get("jn 1.1");
		const call = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
		const options = call?.[1] as RequestInit | undefined;
		expect((options?.headers as Record<string, string>).Authorization).toBe("secret-token");
		store.close();
	});
});

describe("bible.getRandomProverb", () => {
	test("returns cached proverb without hitting fetch", async () => {
		const store = createStore(":memory:");
		const ref = pickRandomProverbRef(() => 0);
		store.saveProverb({ query: ref.query, title: "Proverbs 1:1", text: "cached prov" });
		const fetchImpl = bombFetch();
		const bible = createBible({ store, authToken: "x", fetchImpl });
		const result = await bible.getRandomProverb(() => 0);
		expect(result?.title).toBe("Proverbs 1:1");
		expect(result?.text).toBe("cached prov");
		expect(fetchImpl).not.toHaveBeenCalled();
		store.close();
	});

	test("fetches, cleans, and stores a new proverb", async () => {
		const store = createStore(":memory:");
		const fetchImpl = fakeFetch({
			canonical: "Proverbs 1:1",
			passages: ["The proverbs of Solomon\n(ESV)"],
			passage_meta: [{}],
		});
		const bible = createBible({ store, authToken: "x", fetchImpl });
		const result = await bible.getRandomProverb(() => 0);
		expect(result?.title).toBe("Proverbs 1:1");
		expect(result?.text).toBe("The proverbs of Solomon");
		expect(store.findProverbByQuery("20001001")?.text).toBe("The proverbs of Solomon");
		store.close();
	});

	test("returns null when no passages come back", async () => {
		const store = createStore(":memory:");
		const fetchImpl = fakeFetch({ canonical: "", passages: [], passage_meta: [] });
		const bible = createBible({ store, authToken: "x", fetchImpl });
		const result = await bible.getRandomProverb(() => 0);
		expect(result).toBeNull();
		store.close();
	});
});
