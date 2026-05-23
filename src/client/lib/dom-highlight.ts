export interface OffsetRange {
	start: number;
	end: number;
}

export const HIGHLIGHT_CLASS = "highlight";
export const HIGHLIGHT_ID_ATTR = "data-highlight-id";

function textOffsetFromNode(root: Node, node: Node, offset: number): number {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let total = 0;
	let cur = walker.nextNode();
	while (cur) {
		if (cur === node) return total + offset;
		// If the target is inside an element node (rare for ranges), bail out at first
		// text node past it. For our use case (selections in text-only content) this is fine.
		total += (cur as Text).length;
		cur = walker.nextNode();
	}
	return total;
}

export function getSelectionOffsets(root: HTMLElement): OffsetRange | null {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
	const range = sel.getRangeAt(0);
	if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

	const start = textOffsetFromNode(root, range.startContainer, range.startOffset);
	const end = textOffsetFromNode(root, range.endContainer, range.endOffset);
	if (end <= start) return null;
	return { start, end };
}

export function getSelectionRect(): DOMRect | null {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
	const rect = sel.getRangeAt(0).getBoundingClientRect();
	if (rect.width === 0 && rect.height === 0) return null;
	return rect;
}

interface HighlightSpec {
	id: string;
	start: number;
	end: number;
	hasNote: boolean;
}

/**
 * Resets the passage container to its pristine text by unwrapping any previously
 * applied highlight spans, then re-wraps every range from scratch. This keeps the
 * stored offsets (which index into the original textContent) authoritative.
 */
export function applyHighlights(root: HTMLElement, highlights: HighlightSpec[]): void {
	unwrapHighlights(root);
	// Process from the end so earlier offsets stay valid as we split nodes.
	const sorted = [...highlights].sort((a, b) => b.start - a.start);
	for (const h of sorted) wrapRange(root, h);
}

function unwrapHighlights(root: HTMLElement): void {
	const wraps = root.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
	for (const wrap of wraps) {
		const parent = wrap.parentNode;
		if (!parent) continue;
		while (wrap.firstChild) parent.insertBefore(wrap.firstChild, wrap);
		parent.removeChild(wrap);
	}
	root.normalize(); // merge adjacent text nodes
}

function wrapRange(root: HTMLElement, spec: HighlightSpec): void {
	// Phase 1 — collect targets without modifying the DOM. Splitting text nodes
	// during the walk creates new sibling text nodes that the TreeWalker would
	// revisit, doubling up the wrap.
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const targets: { node: Text; from: number; to: number }[] = [];
	let offset = 0;
	let node = walker.nextNode() as Text | null;

	while (node) {
		const len = node.length;
		const nodeEnd = offset + len;
		if (nodeEnd > spec.start && offset < spec.end) {
			targets.push({
				node,
				from: Math.max(0, spec.start - offset),
				to: Math.min(len, spec.end - offset),
			});
		}
		offset = nodeEnd;
		if (offset >= spec.end) break;
		node = walker.nextNode() as Text | null;
	}

	// Phase 2 — split and wrap. Each target is an independent node, so mutating
	// one doesn't perturb the others.
	for (const t of targets) {
		let target = t.node;
		if (t.to < target.length) target.splitText(t.to);
		if (t.from > 0) target = target.splitText(t.from);
		const span = document.createElement("span");
		span.className = spec.hasNote ? `${HIGHLIGHT_CLASS} has-note` : HIGHLIGHT_CLASS;
		span.setAttribute(HIGHLIGHT_ID_ATTR, spec.id);
		target.parentNode?.insertBefore(span, target);
		span.appendChild(target);
	}
}

export function findHighlightId(target: EventTarget | null): string | null {
	if (!(target instanceof Element)) return null;
	const wrap = target.closest(`.${HIGHLIGHT_CLASS}`);
	return wrap?.getAttribute(HIGHLIGHT_ID_ATTR) ?? null;
}
