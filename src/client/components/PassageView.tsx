import { useEffect, useRef, useState } from "preact/hooks";
import type { Passage } from "../lib/api.ts";
import {
	applyHighlights,
	findHighlightId,
	getSelectionOffsets,
	getSelectionRect,
} from "../lib/dom-highlight.ts";
import {
	type Highlight,
	addHighlight,
	deleteHighlight,
	getHighlights,
	updateHighlight,
} from "../lib/highlights.ts";
import { HighlightPopup, type PopupAnchor } from "./HighlightPopup.tsx";

interface Props {
	passage: Passage;
	onNavigate: (q: string) => void;
	atBottom: boolean;
}

const SWIPE_MIN_DISTANCE = 60;
const SWIPE_MAX_DURATION_MS = 500;
const SWIPE_HORIZONTAL_RATIO = 1.5;

type PopupState =
	| { kind: "create"; anchor: PopupAnchor; range: { start: number; end: number; text: string } }
	| { kind: "view"; anchor: PopupAnchor; highlight: Highlight }
	| null;

function anchorFromRect(rect: DOMRect, containerRect: DOMRect): PopupAnchor {
	// rect and containerRect are both viewport coordinates. The popup is position:absolute
	// inside the article (which has position:relative), so offsets relative to the container
	// are what we need — and they're scroll-independent.
	return {
		top: rect.bottom - containerRect.top + 8,
		left: rect.left + rect.width / 2 - containerRect.left,
	};
}

export function PassageView({ passage, onNavigate, atBottom }: Props) {
	const [shared, setShared] = useState(false);
	const [highlights, setHighlights] = useState<Highlight[]>([]);
	const [popup, setPopup] = useState<PopupState>(null);
	const articleRef = useRef<HTMLElement>(null);
	const textRef = useRef<HTMLDivElement>(null);

	// Load highlights when the passage changes.
	useEffect(() => {
		let cancelled = false;
		setPopup(null);
		getHighlights(passage.title).then((rows) => {
			if (!cancelled) setHighlights(rows);
		});
		return () => {
			cancelled = true;
		};
	}, [passage.title]);

	// Apply highlights to the rendered DOM after each passage/highlights change.
	// biome-ignore lint/correctness/useExhaustiveDependencies: passage.text is the load-bearing trigger for re-applying highlights when dangerouslySetInnerHTML replaces the DOM.
	useEffect(() => {
		const el = textRef.current;
		if (!el) return;
		applyHighlights(
			el,
			highlights.map((h) => ({
				id: h.id,
				start: h.start,
				end: h.end,
				hasNote: h.note.length > 0,
			})),
		);
	}, [passage.text, highlights]);

	// Swipe navigation.
	useEffect(() => {
		const el = articleRef.current;
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

	// Watch for the user finishing a selection. Listen to selectionchange (the
	// spec-level signal) and debounce so the popup appears AFTER the user stops
	// adjusting selection handles on mobile, not on every intermediate tick.
	useEffect(() => {
		const el = textRef.current;
		if (!el) return;
		let timer: ReturnType<typeof setTimeout> | null = null;

		const checkSelection = () => {
			const sel = window.getSelection();
			if (!sel || sel.isCollapsed) return;
			const offsets = getSelectionOffsets(el);
			if (!offsets) return;
			const rect = getSelectionRect();
			if (!rect) return;
			const text = sel.toString().trim();
			if (!text) return;
			const articleRect = articleRef.current?.getBoundingClientRect();
			if (!articleRect) return;
			setPopup({
				kind: "create",
				anchor: anchorFromRect(rect, articleRect),
				range: { start: offsets.start, end: offsets.end, text },
			});
		};

		const onSelectionChange = () => {
			if (timer) clearTimeout(timer);
			timer = setTimeout(checkSelection, 350);
		};

		document.addEventListener("selectionchange", onSelectionChange);
		return () => {
			document.removeEventListener("selectionchange", onSelectionChange);
			if (timer) clearTimeout(timer);
		};
	}, []);

	// Tap an existing highlight to view its note.
	useEffect(() => {
		const el = textRef.current;
		if (!el) return;
		const onClick = (e: MouseEvent) => {
			const id = findHighlightId(e.target);
			if (!id) return;
			const highlight = highlights.find((h) => h.id === id);
			if (!highlight) return;
			const articleRect = articleRef.current?.getBoundingClientRect();
			if (!articleRect) return;
			const rect = (e.target as Element).getBoundingClientRect();
			e.stopPropagation();
			setPopup({
				kind: "view",
				anchor: anchorFromRect(rect, articleRect),
				highlight,
			});
		};
		el.addEventListener("click", onClick);
		return () => el.removeEventListener("click", onClick);
	}, [highlights]);

	const clearSelection = () => window.getSelection()?.removeAllRanges();

	const onHighlight = async () => {
		if (popup?.kind !== "create") return;
		const created = await addHighlight({
			passageTitle: passage.title,
			start: popup.range.start,
			end: popup.range.end,
			text: popup.range.text,
		});
		setHighlights((prev) => [...prev, created].sort((a, b) => a.start - b.start));
		setPopup(null);
		clearSelection();
	};

	const onAddNote = async (note: string) => {
		if (popup?.kind !== "create") return;
		const created = await addHighlight({
			passageTitle: passage.title,
			start: popup.range.start,
			end: popup.range.end,
			text: popup.range.text,
			note,
		});
		setHighlights((prev) => [...prev, created].sort((a, b) => a.start - b.start));
		setPopup(null);
		clearSelection();
	};

	const onSaveNote = async (note: string) => {
		if (popup?.kind !== "view") return;
		const updated = await updateHighlight(popup.highlight.id, { note });
		if (!updated) return;
		setHighlights((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
		setPopup(null);
	};

	const onDeleteHighlight = async () => {
		if (popup?.kind !== "view") return;
		await deleteHighlight(popup.highlight.id);
		setHighlights((prev) => prev.filter((h) => h.id !== popup.highlight.id));
		setPopup(null);
	};

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
		<article ref={articleRef} class="prose-zinc relative touch-pan-y">
			<div
				ref={textRef}
				class="esv-text text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted ESV-API HTML
				dangerouslySetInnerHTML={{ __html: passage.text }}
			/>

			{popup?.kind === "create" && (
				<HighlightPopup
					mode="create"
					anchor={popup.anchor}
					onHighlight={onHighlight}
					onAddNote={onAddNote}
					onDismiss={() => {
						setPopup(null);
						clearSelection();
					}}
				/>
			)}
			{popup?.kind === "view" && (
				<HighlightPopup
					mode="view"
					anchor={popup.anchor}
					highlight={popup.highlight}
					onSaveNote={onSaveNote}
					onDelete={onDeleteHighlight}
					onDismiss={() => setPopup(null)}
				/>
			)}

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
