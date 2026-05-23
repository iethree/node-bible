import "../test-setup.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	HIGHLIGHT_CLASS,
	HIGHLIGHT_ID_ATTR,
	applyHighlights,
	findHighlightId,
	getSelectionOffsets,
} from "./dom-highlight.ts";

let root: HTMLElement;

beforeEach(() => {
	root = document.createElement("div");
	document.body.appendChild(root);
});

afterEach(() => {
	root.remove();
});

function setHTML(html: string) {
	root.innerHTML = html;
}

function getHighlightSpans() {
	return Array.from(root.querySelectorAll(`.${HIGHLIGHT_CLASS}`));
}

describe("applyHighlights", () => {
	test("wraps a single range across plain text", () => {
		setHTML("For God so loved the world");
		applyHighlights(root, [{ id: "h1", start: 4, end: 10, hasNote: false }]);

		const spans = getHighlightSpans();
		expect(spans).toHaveLength(1);
		expect(spans[0]?.textContent).toBe("God so");
		expect(spans[0]?.getAttribute(HIGHLIGHT_ID_ATTR)).toBe("h1");
		expect(root.textContent).toBe("For God so loved the world");
	});

	test("hasNote adds the has-note class", () => {
		setHTML("For God so loved the world");
		applyHighlights(root, [{ id: "h1", start: 0, end: 3, hasNote: true }]);
		const span = getHighlightSpans()[0];
		expect(span?.classList.contains(HIGHLIGHT_CLASS)).toBe(true);
		expect(span?.classList.contains("has-note")).toBe(true);
	});

	test("wraps multiple non-overlapping ranges", () => {
		setHTML("For God so loved the world");
		applyHighlights(root, [
			{ id: "h1", start: 4, end: 7, hasNote: false }, // "God"
			{ id: "h2", start: 11, end: 16, hasNote: true }, // "loved"
		]);
		const spans = getHighlightSpans();
		expect(spans).toHaveLength(2);
		// Sorted in DOM order:
		const byId = Object.fromEntries(spans.map((s) => [s.getAttribute(HIGHLIGHT_ID_ATTR), s]));
		expect(byId.h1?.textContent).toBe("God");
		expect(byId.h2?.textContent).toBe("loved");
		expect(root.textContent).toBe("For God so loved the world");
	});

	test("walks across element boundaries", () => {
		setHTML("<p>For God</p><p> so loved</p>");
		// "God so" spans both paragraphs (4 chars "For ", 3 "God", 4 " so ", 5 "loved")
		// textContent: "For God so loved"
		// Start at "God" → 4..10 covers "God so"
		applyHighlights(root, [{ id: "h", start: 4, end: 10, hasNote: false }]);
		const spans = getHighlightSpans();
		// Range crosses a paragraph break, so we expect two segment wrappers.
		expect(spans.length).toBeGreaterThanOrEqual(2);
		const joined = spans.map((s) => s.textContent ?? "").join("");
		expect(joined).toBe("God so");
		for (const s of spans) {
			expect(s.getAttribute(HIGHLIGHT_ID_ATTR)).toBe("h");
		}
	});

	test("is idempotent across repeated calls (unwraps + re-applies)", () => {
		setHTML("For God so loved the world");
		const spec = { id: "h1", start: 4, end: 10, hasNote: false };
		applyHighlights(root, [spec]);
		applyHighlights(root, [spec]);

		const spans = getHighlightSpans();
		expect(spans).toHaveLength(1);
		expect(spans[0]?.textContent).toBe("God so");
		expect(root.textContent).toBe("For God so loved the world");
	});

	test("adding a second highlight after a first does not corrupt offsets", () => {
		setHTML("For God so loved the world");
		applyHighlights(root, [{ id: "h1", start: 4, end: 10, hasNote: false }]);
		// Now add another highlight with the original offsets — this is the exact
		// regression scenario from the IDB-backed flow.
		applyHighlights(root, [
			{ id: "h1", start: 4, end: 10, hasNote: false },
			{ id: "h2", start: 11, end: 16, hasNote: false },
		]);

		const spans = getHighlightSpans();
		expect(spans).toHaveLength(2);
		const byId = Object.fromEntries(spans.map((s) => [s.getAttribute(HIGHLIGHT_ID_ATTR), s]));
		expect(byId.h1?.textContent).toBe("God so");
		expect(byId.h2?.textContent).toBe("loved");
	});

	test("removing a highlight on re-apply unwraps it", () => {
		setHTML("For God so loved the world");
		applyHighlights(root, [{ id: "h1", start: 4, end: 10, hasNote: false }]);
		applyHighlights(root, []);
		expect(getHighlightSpans()).toHaveLength(0);
		expect(root.textContent).toBe("For God so loved the world");
	});

	test("empty highlight list leaves DOM textContent unchanged", () => {
		setHTML("<p>Some <em>nested</em> text.</p>");
		const before = root.textContent;
		applyHighlights(root, []);
		expect(root.textContent).toBe(before);
		expect(getHighlightSpans()).toHaveLength(0);
	});
});

describe("findHighlightId", () => {
	test("returns the id of the nearest highlight ancestor", () => {
		setHTML("For God so loved the world");
		applyHighlights(root, [{ id: "h1", start: 4, end: 10, hasNote: false }]);
		const span = root.querySelector(`.${HIGHLIGHT_CLASS}`);
		expect(findHighlightId(span)).toBe("h1");

		// Also resolves from a descendant text node's parentElement.
		const textNode = span?.firstChild;
		expect(findHighlightId(textNode?.parentElement ?? null)).toBe("h1");
	});

	test("returns null when the target is outside any highlight", () => {
		setHTML("For God so loved the world");
		applyHighlights(root, [{ id: "h1", start: 4, end: 10, hasNote: false }]);
		expect(findHighlightId(root)).toBeNull();
	});

	test("returns null for non-element targets", () => {
		expect(findHighlightId(null)).toBeNull();
	});
});

describe("getSelectionOffsets", () => {
	test("returns offsets for a selection contained in the root", () => {
		setHTML("For God so loved the world");
		const textNode = root.firstChild as Text;

		const range = document.createRange();
		range.setStart(textNode, 4);
		range.setEnd(textNode, 10);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);

		const offsets = getSelectionOffsets(root);
		expect(offsets).toEqual({ start: 4, end: 10 });
	});

	test("returns null when the selection is collapsed", () => {
		setHTML("For God so loved the world");
		const textNode = root.firstChild as Text;
		const range = document.createRange();
		range.setStart(textNode, 4);
		range.setEnd(textNode, 4);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);

		expect(getSelectionOffsets(root)).toBeNull();
	});

	test("returns null when there is no selection", () => {
		window.getSelection()?.removeAllRanges();
		setHTML("anything");
		expect(getSelectionOffsets(root)).toBeNull();
	});
});
