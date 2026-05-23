import { inspect } from "node:util";

const RED = "\x1b[91m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const MAGENTA_BG = "\x1b[45m";
const RESET = "\x1b[0m";

function fmt(args: unknown[]): string {
	return args.map((i) => (typeof i === "object" && i !== null ? inspect(i) : String(i))).join(" ");
}

function color(code: string, args: unknown[]): string {
	return `${code}${fmt(args)}${RESET}`;
}

export const log = {
	err: (...args: unknown[]) => console.log(color(RED, args)),
	warn: (...args: unknown[]) => console.log(color(YELLOW, args)),
	success: (...args: unknown[]) => console.log(color(GREEN, args)),
	info: (...args: unknown[]) => console.log(color(CYAN, args)),
	debug: (...args: unknown[]) => console.log(color(MAGENTA_BG, args)),
	log: (...args: unknown[]) => console.log(...args),
};
