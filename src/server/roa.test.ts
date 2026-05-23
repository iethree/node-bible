import { describe, expect, test } from "bun:test";
import { allRulesCount, getRandomRule, getRule } from "./roa.ts";

describe("roa", () => {
	test("data set is non-empty", () => {
		expect(allRulesCount()).toBeGreaterThan(50);
	});

	test("getRandomRule returns a Rule shape from the data set", () => {
		for (let i = 0; i < 50; i++) {
			const rule = getRandomRule();
			expect(typeof rule.Number).toBe("number");
			expect(rule.Rule.length).toBeGreaterThan(0);
			expect(rule.Source.length).toBeGreaterThan(0);
		}
	});

	test("getRule finds a known rule", () => {
		const rule = getRule(10);
		expect(rule?.Rule).toMatch(/Greed is eternal/);
	});

	test("getRule returns undefined for an unknown rule", () => {
		expect(getRule(99999)).toBeUndefined();
	});
});
