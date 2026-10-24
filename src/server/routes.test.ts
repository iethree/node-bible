import { describe, expect, mock, test } from "bun:test";
import { createApp } from "./app.ts";
import { createTestD1 } from "./test-d1.ts";

const mockEsv = mock(async (input: URL | RequestInfo) => {
	const url = String(input);
	if (url.includes("/text/")) {
		return new Response(
			JSON.stringify({
				canonical: "Proverbs 1:1",
				passages: ["The proverbs of Solomon"],
				passage_meta: [{}],
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	}
	return new Response(
		JSON.stringify({
			canonical: "John 3:16",
			passages: ["<p>For God so loved</p>"],
			passage_meta: [{ next_chapter: [43, 4, 1], prev_chapter: [43, 3, 1] }],
		}),
		{ status: 200, headers: { "Content-Type": "application/json" } },
	);
}) as unknown as typeof fetch;

const handle = createApp({ db: createTestD1(), authToken: "test-token", fetchImpl: mockEsv });

function get(path: string) {
	return handle(new Request(`http://bible.test${path}`));
}

describe("GET /api/:query", () => {
	test("returns the passage as JSON", async () => {
		const res = await get("/api/jn3.16");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { title: string; text: string };
		expect(body.title).toBe("John 3:16");
		expect(body.text).toContain("For God so loved");
	});
});

describe("GET /api/roa", () => {
	test("returns a rule of acquisition", async () => {
		const res = await get("/api/roa");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { reference: string; text: string };
		expect(body.reference).toMatch(/^Rule of Acquisition Number \d+$/);
		expect(body.text.length).toBeGreaterThan(0);
	});
});

describe("GET /api/rp", () => {
	test("returns either a proverb or an ROA", async () => {
		const res = await get("/api/rp");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { reference: string; text: string };
		expect(typeof body.reference).toBe("string");
		expect(typeof body.text).toBe("string");
		expect(body.text.length).toBeGreaterThan(0);
	});
});

describe("unknown routes", () => {
	test("non-api routes 404 (static assets are served before the Worker)", async () => {
		const res = await get("/anything-else");
		expect(res.status).toBe(404);
	});

	test("non-GET api requests 404", async () => {
		const res = await handle(new Request("http://bible.test/api/roa", { method: "POST" }));
		expect(res.status).toBe(404);
	});
});
