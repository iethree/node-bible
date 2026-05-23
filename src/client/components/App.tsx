import { useEffect, useRef, useState } from "preact/hooks";
import useSWR from "swr";
import { type Passage, fetcher, passageKey } from "../lib/api.ts";
import { pushRecent, readRecent, searchFriendly } from "../lib/recent.ts";
import { applyTheme, isNight } from "../lib/theme.ts";
import { PassageView } from "./PassageView.tsx";
import { RecentList } from "./RecentList.tsx";
import { SearchBar } from "./SearchBar.tsx";

function urlQuery(): string {
	const path = window.location.pathname.replace(/^\/+/, "");
	return path === "" ? "" : decodeURIComponent(path);
}

const SCROLL_THRESHOLD = 20;

export function App() {
	const [query, setQuery] = useState<string>(urlQuery);
	const [passage, setPassage] = useState<Passage | null>(null);
	const [recent, setRecent] = useState<string[]>(readRecent());
	const [atTop, setAtTop] = useState(true);
	const [atBottom, setAtBottom] = useState(false);
	const pendingPush = useRef(false);
	const pendingRecent = useRef(false);
	const lastTitle = useRef<string>("");
	const mainRef = useRef<HTMLElement>(null);

	useEffect(() => {
		applyTheme(isNight());
	}, []);

	useEffect(() => {
		const onScroll = () => {
			setAtTop(window.scrollY < SCROLL_THRESHOLD);
			setAtBottom(
				window.innerHeight + window.scrollY >= document.body.scrollHeight - SCROLL_THRESHOLD,
			);
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const { data, error, isLoading } = useSWR<Passage>(query ? passageKey(query) : null, fetcher, {
		revalidateOnFocus: false,
		revalidateIfStale: false,
		dedupingInterval: 60_000,
	});

	useEffect(() => {
		if (!data || data.title === lastTitle.current) return;
		lastTitle.current = data.title;
		document.title = data.title;
		setPassage(data);
		if (pendingRecent.current) {
			setRecent(pushRecent(data.title));
			pendingRecent.current = false;
		}
		if (pendingPush.current) {
			window.history.pushState({}, data.title, `/${searchFriendly(data.title)}`);
			pendingPush.current = false;
		}
		requestAnimationFrame(() => {
			mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		});
	}, [data]);

	useEffect(() => {
		const onPop = () => {
			const next = urlQuery();
			setQuery(next);
			if (!next) {
				setPassage(null);
				lastTitle.current = "";
			}
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, []);

	const performLoad = (q: string, opts: { addToRecent: boolean }) => {
		const trimmed = q.trim();
		if (!trimmed || trimmed === query) return;
		pendingPush.current = true;
		pendingRecent.current = opts.addToRecent;
		setQuery(trimmed);
	};

	const onSearch = (q: string) => performLoad(q, { addToRecent: true });
	const onNavigate = (q: string) => performLoad(q, { addToRecent: false });

	const goHome = (e: Event) => {
		e.preventDefault();
		window.history.pushState({}, "Bible", "/");
		document.title = "Bible";
		lastTitle.current = "";
		setQuery("");
		setPassage(null);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	return (
		<div class="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-4">
			{isLoading && (
				<div
					role="status"
					aria-label="Loading"
					class="fixed top-3 right-3 z-50 size-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200"
				/>
			)}
			<div
				aria-hidden={!atTop}
				class={`overflow-hidden transition-all duration-200 ease-out ${
					atTop ? "opacity-100" : "pointer-events-none opacity-0"
				}`}
			>
				<header class="relative mb-2 flex items-center justify-center">
					<a href="/" class="text-xl font-semibold tracking-tight" onClick={goHome}>
						Bible
					</a>
				</header>

				<SearchBar onSearch={onSearch} loading={isLoading} />
			</div>

			{error && (
				<p class="mt-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
					{(error as Error).message}
				</p>
			)}

			<main ref={mainRef} class="mt-6 flex-1">
				{passage ? (
					<PassageView passage={passage} onNavigate={onNavigate} atBottom={atBottom} />
				) : (
					<RecentList recent={recent} onPick={onSearch} />
				)}
			</main>
		</div>
	);
}
