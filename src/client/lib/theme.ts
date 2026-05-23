const KEY = "night";

// Must match Tailwind's zinc-100 / zinc-900 used as the body background.
// Mobile Chrome reads these to tint the address bar and bottom nav bar.
const DAY = "#f4f4f5";
const NIGHT = "#18181b";

export function isNight(): boolean {
	return localStorage.getItem(KEY) === "true";
}

export function applyTheme(night: boolean): void {
	document.documentElement.classList.toggle("dark", night);
	const explicit = document.querySelector('meta[name="theme-color"]:not([media])');
	if (explicit) explicit.setAttribute("content", night ? NIGHT : DAY);
}

export function setNight(night: boolean): void {
	localStorage.setItem(KEY, String(night));
	applyTheme(night);
}
