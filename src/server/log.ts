// Workers Logs record console output with its level, so no colour codes.
export const log = {
	err: (...args: unknown[]) => console.error(...args),
	info: (...args: unknown[]) => console.info(...args),
};
