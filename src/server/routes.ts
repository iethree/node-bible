import { type Request, type Response, Router } from "express";
import type { Bible } from "./bible.ts";
import { getRandomInt } from "./random.ts";
import { getRandomRule } from "./roa.ts";

const PROVERB_RULE_CHANCE = 5; // % chance an ROA is shown instead of a proverb

export interface ApiDeps {
	bible: Bible;
}

export function createApiRouter(deps: ApiDeps): Router {
	const { bible } = deps;
	const router = Router();

	router.get("/rp", async (_req: Request, res: Response) => {
		if (getRandomInt(0, 100) < PROVERB_RULE_CHANCE) {
			const rule = getRandomRule();
			res.json({
				reference: `Rule of Acquisition Number ${rule.Number}`,
				text: rule.Rule,
			});
			return;
		}
		const prov = await bible.getRandomProverb();
		if (!prov) {
			res.status(502).json({ error: "proverb lookup failed" });
			return;
		}
		res.json({ reference: prov.title, text: prov.text });
	});

	router.get("/roa", (_req: Request, res: Response) => {
		const rule = getRandomRule();
		res.json({
			reference: `Rule of Acquisition Number ${rule.Number}`,
			text: rule.Rule,
		});
	});

	router.get("/:query", async (req: Request, res: Response) => {
		const query = req.params.query;
		if (!query) {
			res.json({ title: "Bible", text: "" });
			return;
		}
		const passage = await bible.get(query);
		res.json(passage);
	});

	return router;
}
