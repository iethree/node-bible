interface Props {
	recent: string[];
	onPick: (q: string) => void;
}

export function RecentList({ recent, onPick }: Props) {
	if (recent.length === 0) {
		return null;
	}

	return (
		<div class="mt-4">
			<h2 class="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-center">
				Recent
			</h2>
			<ul class="flex flex-wrap gap-2 justify-center">
				{recent.map((title) => (
					<li key={title}>
						<button
							type="button"
							onClick={() => onPick(title)}
							class="rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 transition hover:border-violet-950 hover:text-violet-950 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-violet-300 dark:hover:text-violet-300 cursor-pointer"
						>
							{title}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
