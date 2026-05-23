import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import type { Server } from "node:http";
import { type AddressInfo, createServer } from "node:net";
import { createApp } from "./app.ts";

function getFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const srv = createServer();
		srv.listen(0, () => {
			const addr = srv.address() as AddressInfo;
			srv.close((err) => (err ? reject(err) : resolve(addr.port)));
		});
	});
}

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

let server: Server;
let baseUrl: string;

beforeAll(async () => {
	const port = await getFreePort();
	const { app } = createApp({
		dbPath: ":memory:",
		authToken: "test-token",
		clientDir: "/nonexistent",
		publicDir: "/nonexistent",
		enableLogger: false,
		fetchImpl: mockEsv,
	});
	await new Promise<void>((resolve) => {
		server = app.listen(port, () => resolve());
	});
	baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve, reject) =>
		server.close((err) => (err ? reject(err) : resolve())),
	);
});

describe("GET /api/:query", () => {
	test("returns the passage as JSON", async () => {
		const res = await fetch(`${baseUrl}/api/jn3.16`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { title: string; text: string };
		expect(body.title).toBe("John 3:16");
		expect(body.text).toContain("For God so loved");
	});
});

describe("GET /api/roa", () => {
	test("returns a rule of acquisition", async () => {
		const res = await fetch(`${baseUrl}/api/roa`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { reference: string; text: string };
		expect(body.reference).toMatch(/^Rule of Acquisition Number \d+$/);
		expect(body.text.length).toBeGreaterThan(0);
	});
});

describe("GET /api/rp", () => {
	test("returns either a proverb or an ROA", async () => {
		const res = await fetch(`${baseUrl}/api/rp`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { reference: string; text: string };
		expect(typeof body.reference).toBe("string");
		expect(typeof body.text).toBe("string");
		expect(body.text.length).toBeGreaterThan(0);
	});
});

describe("unknown routes", () => {
	test("non-api routes 404 when no client bundle is present", async () => {
		const res = await fetch(`${baseUrl}/anything-else`);
		expect(res.status).toBe(404);
	});
});
