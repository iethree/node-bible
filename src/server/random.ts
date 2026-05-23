export function getRandomInt(min: number, max: number): number {
	const lo = Math.ceil(min);
	const hi = Math.floor(max);
	return Math.floor(Math.random() * (hi - lo)) + lo;
}
