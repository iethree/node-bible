import { useState } from "preact/hooks";

interface Props {
	onSearch: (query: string) => void;
	loading: boolean;
}

export function SearchBar({ onSearch, loading }: Props) {
	const [value, setValue] = useState("");

	const submit = (e: Event) => {
		e.preventDefault();
		const q = value.trim();
		if (!q) return;
		onSearch(q);
	};

	return (
		<form onSubmit={submit} class="flex gap-2">
			<input
				type="text"
				value={value}
				onInput={(e) => setValue((e.target as HTMLInputElement).value)}
				placeholder="Search (e.g. john 3:16)"
				class="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400focus:outline-none focus:ring-1 dark:border-zinc-700 dark:bg-zinc-800 dark:placeholder:text-zinc-500"
				aria-label="Search the Bible"
			/>
			<button
				type="submit"
				disabled={loading}
				class="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-white cursor-pointer"
			>
				{loading ? "…" : "Search"}
			</button>
		</form>
	);
}
