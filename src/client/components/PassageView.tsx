import { useEffect, useRef, useState } from "preact/hooks";
import type { Passage } from "../lib/api.ts";

interface Props {
	passage: Passage;
	onNavigate: (q: string) => void;
	atBottom: boolean;
}

const SWIPE_MIN_DISTANCE = 60;
const SWIPE_MAX_DURATION_MS = 500;
const SWIPE_HORIZONTAL_RATIO = 1.5;

export function PassageView({ passage, onNavigate, atBottom }: Props) {
	const [shared, setShared] = useState(false);
	const containerRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		let startX = 0;
		let startY = 0;
		let startT = 0;

		const onStart = (e: TouchEvent) => {
			const t = e.touches[0];
			if (!t) return;
			startX = t.clientX;
			startY = t.clientY;
			startT = Date.now();
		};
		const onEnd = (e: TouchEvent) => {
			const t = e.changedTouches[0];
			if (!t) return;
			const dx = t.clientX - startX;
			const dy = t.clientY - startY;
			if (Date.now() - startT > SWIPE_MAX_DURATION_MS) return;
			if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
			if (Math.abs(dx) < Math.abs(dy) * SWIPE_HORIZONTAL_RATIO) return;
			if (dx < 0 && passage.next) onNavigate(passage.next);
			else if (dx > 0 && passage.prev) onNavigate(passage.prev);
		};

		el.addEventListener("touchstart", onStart, { passive: true });
		el.addEventListener("touchend", onEnd, { passive: true });
		return () => {
			el.removeEventListener("touchstart", onStart);
			el.removeEventListener("touchend", onEnd);
		};
	}, [passage.next, passage.prev, onNavigate]);

	const share = async () => {
		const data = { title: document.title, url: document.URL };
		if (navigator.share) {
			try {
				await navigator.share(data);
				setShared(true);
				return;
			} catch {
				/* fallthrough to clipboard */
			}
		}
		try {
			await navigator.clipboard.writeText(`${data.title} : ${data.url}`);
			setShared(true);
		} catch {
			/* ignore */
		}
		setTimeout(() => setShared(false), 1500);
	};

	return (
		<article ref={containerRef} class="prose-zinc touch-pan-y">
			<div
				class="esv-text text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted ESV-API HTML
				dangerouslySetInnerHTML={{ __html: passage.text }}
			/>

			<div
				class={`mt-8 flex items-center justify-between gap-2 text-sm ${atBottom ? "opacity-100" : "pointer-events-none opacity-0"} transition-opacity duration-200 ease-out`}
			>
				<button
					type="button"
					disabled={!passage.prev}
					onClick={() => passage.prev && onNavigate(passage.prev)}
					class="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 transition hover:border-violet-950 hover:text-violet-950 dark:hover:border-violet-300 dark:hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200"
				>
					← Previous
				</button>
				<button
					type="button"
					onClick={share}
					class="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 transition  dark:border-zinc-700 dark:text-zinc-200"
				>
					{shared ? "Copied ✓" : "Share"}
				</button>
				<button
					type="button"
					disabled={!passage.next}
					onClick={() => passage.next && onNavigate(passage.next)}
					class="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200"
				>
					Next →
				</button>
			</div>
		</article>
	);
}
