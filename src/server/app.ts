import { type Bible, createBible } from "./bible.ts";
import { createStore } from "./db.ts";
import { log } from "./log.ts";
import { getRandomInt } from "./random.ts";
import { getRandomRule } from "./roa.ts";

const PROVERB_RULE_CHANCE = 5; // % chance an ROA is shown instead of a proverb

export interface AppOptions {
	db: D1Database;
	authToken: string;
	fetchImpl?: typeof fetch;
}

function randomRule(): Response {
	const rule = getRandomRule();
	return Response.json({
		reference: `Rule of Acquisition Number ${rule.Number}`,
		text: rule.Rule,
	});
}

async function randomProverb(bible: Bible): Promise<Response> {
	if (getRandomInt(0, 100) < PROVERB_RULE_CHANCE) return randomRule();
	const prov = await bible.getRandomProverb();
	if (!prov) return Response.json({ error: "proverb lookup failed" }, { status: 502 });
	return Response.json({ reference: prov.title, text: prov.text });
}

/**
 * Handles /api/* requests. Everything else is served by Workers static assets
 * (see wrangler.jsonc), which never reach this handler.
 */
export function createApp(opts: AppOptions) {
	const store = createStore(opts.db);
	const bible = createBible({ store, authToken: opts.authToken, fetchImpl: opts.fetchImpl });

	return async function handle(req: Request): Promise<Response> {
		const { pathname } = new URL(req.url);
		const match = /^\/api\/([^/]*)$/.exec(pathname);
		if (req.method !== "GET" || !match) {
			return Response.json({ error: "Not Found" }, { status: 404 });
		}
		try {
			const segment = decodeURIComponent(match[1] ?? "");
			if (segment === "rp") return await randomProverb(bible);
			if (segment === "roa") return randomRule();
			if (!segment) return Response.json({ title: "Bible", text: "" });
			return Response.json(await bible.get(segment));
		} catch (err) {
			log.err(`request failed: ${(err as Error).message}`);
			return Response.json({ error: (err as Error).message }, { status: 500 });
		}
	};
}
