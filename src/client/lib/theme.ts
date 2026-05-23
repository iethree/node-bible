const KEY = "night";

// Must match Tailwind's zinc-100 / zinc-900 used as the body background.
const DAY = "#f4f4f5";
const NIGHT = "#18181b";

export function isNight(): boolean {
	const saved = localStorage.getItem(KEY);
	if (saved === "true") return true;
	if (saved === "false") return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(night: boolean): void {
	document.documentElement.classList.toggle("dark", night);
	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta) meta.setAttribute("content", night ? NIGHT : DAY);
}

export function setNight(night: boolean): void {
	localStorage.setItem(KEY, String(night));
	applyTheme(night);
}
