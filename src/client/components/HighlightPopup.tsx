import { useEffect, useRef, useState } from "preact/hooks";
import type { Highlight } from "../lib/highlights.ts";

export interface PopupAnchor {
	top: number;
	left: number;
}

interface CreateProps {
	mode: "create";
	anchor: PopupAnchor;
	onHighlight: () => void;
	onAddNote: (note: string) => void;
	onDismiss: () => void;
}

interface ViewProps {
	mode: "view";
	anchor: PopupAnchor;
	highlight: Highlight;
	onSaveNote: (note: string) => void;
	onDelete: () => void;
	onDismiss: () => void;
}

type Props = CreateProps | ViewProps;

const PANEL =
	"absolute z-40 w-max max-w-[20rem] -translate-x-1/2 rounded-md border border-zinc-200 bg-white p-2 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-800";

const BTN =
	"rounded-md px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer";

const PRIMARY_BTN =
	"rounded-md bg-zinc-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 cursor-pointer";

const DANGER_BTN =
	"rounded-md px-2 py-1 text-sm text-zinc-500 transition hover:text-red-600 dark:hover:text-red-400 cursor-pointer";

export function HighlightPopup(props: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const [showNoteInput, setShowNoteInput] = useState(
		props.mode === "view" && Boolean(props.highlight.note),
	);
	const [draft, setDraft] = useState(props.mode === "view" ? props.highlight.note : "");

	useEffect(() => {
		const onDown = (e: PointerEvent) => {
			if (!ref.current?.contains(e.target as Node)) props.onDismiss();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") props.onDismiss();
		};
		// Defer so the same click that opened the popup doesn't close it.
		const t = setTimeout(() => {
			document.addEventListener("pointerdown", onDown);
			document.addEventListener("keydown", onKey);
		}, 0);
		return () => {
			clearTimeout(t);
			document.removeEventListener("pointerdown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [props.onDismiss]);

	const style = { top: `${props.anchor.top}px`, left: `${props.anchor.left}px` };

	if (props.mode === "create") {
		if (showNoteInput) {
			return (
				<div ref={ref} class={PANEL} style={style}>
					<textarea
						autofocus
						placeholder="Add a note…"
						value={draft}
						onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
						class="block w-64 resize-none rounded-md border border-zinc-200 bg-white p-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
						rows={3}
					/>
					<div class="mt-2 flex items-center justify-end gap-2">
						<button type="button" class={BTN} onClick={props.onDismiss}>
							Cancel
						</button>
						<button type="button" class={PRIMARY_BTN} onClick={() => props.onAddNote(draft)}>
							Save
						</button>
					</div>
				</div>
			);
		}
		return (
			<div ref={ref} class={PANEL} style={style}>
				<div class="flex items-center gap-1">
					<button type="button" class={BTN} onClick={props.onHighlight}>
						Highlight
					</button>
					<button type="button" class={BTN} onClick={() => setShowNoteInput(true)}>
						Add note
					</button>
				</div>
			</div>
		);
	}

	// view mode
	return (
		<div ref={ref} class={PANEL} style={style}>
			{showNoteInput ? (
				<>
					<textarea
						autofocus
						placeholder="Add a note…"
						value={draft}
						onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
						class="block w-64 resize-none rounded-md border border-zinc-200 bg-white p-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
						rows={3}
					/>
					<div class="mt-2 flex items-center justify-end gap-2">
						<button type="button" class={BTN} onClick={() => setShowNoteInput(false)}>
							Cancel
						</button>
						<button type="button" class={PRIMARY_BTN} onClick={() => props.onSaveNote(draft)}>
							Save
						</button>
					</div>
				</>
			) : (
				<>
					{props.highlight.note ? (
						<p class="whitespace-pre-wrap px-1 py-0.5 text-zinc-700 dark:text-zinc-200">
							{props.highlight.note}
						</p>
					) : (
						<p class="px-1 py-0.5 text-zinc-400 italic dark:text-zinc-500">No note</p>
					)}
					<div class="mt-2 flex items-center justify-between gap-2">
						<button type="button" class={DANGER_BTN} onClick={props.onDelete}>
							Delete
						</button>
						<button type="button" class={BTN} onClick={() => setShowNoteInput(true)}>
							{props.highlight.note ? "Edit" : "Add note"}
						</button>
					</div>
				</>
			)}
		</div>
	);
}
