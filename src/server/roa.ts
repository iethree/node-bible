import { getRandomInt } from "./random.ts";
import rules from "./roa-data.json" with { type: "json" };

export interface Rule {
	Source: string;
	Number: number;
	Rule: string;
}

const allRules = rules as Rule[];

export function getRandomRule(): Rule {
	const rule = allRules[getRandomInt(0, allRules.length)];
	if (!rule) throw new Error("rules list is empty");
	return rule;
}

export function getRule(num: number): Rule | undefined {
	return allRules.find((r) => r.Number === num);
}

export function allRulesCount(): number {
	return allRules.length;
}
