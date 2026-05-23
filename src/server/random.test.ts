import { afterEach, describe, expect, test } from "bun:test";
import { getRandomInt } from "./random.ts";

describe("getRandomInt", () => {
	const originalRandom = Math.random;
	afterEach(() => {
		Math.random = originalRandom;
	});

	test("returns the floor when Math.random() = 0", () => {
		Math.random = () => 0;
		expect(getRandomInt(5, 10)).toBe(5);
	});

	test("returns max - 1 when Math.random() approaches 1", () => {
		Math.random = () => 0.9999999;
		expect(getRandomInt(5, 10)).toBe(9);
	});

	test("returns inclusive min, exclusive max across the full range", () => {
		const values = new Set<number>();
		for (let i = 0; i < 5000; i++) values.add(getRandomInt(0, 5));
		expect([...values].sort()).toEqual([0, 1, 2, 3, 4]);
	});

	test("handles fractional bounds by ceiling min and flooring max", () => {
		Math.random = () => 0;
		expect(getRandomInt(1.2, 5.9)).toBe(2);
	});
});
