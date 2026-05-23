import { useState } from "preact/compat";
import { applyTheme, isNight } from "../lib/theme";

interface Props {
	recent: string[];
	onPick: (q: string) => void;
}

export function RecentList({ recent, onPick }: Props) {
	const [night, setNight] = useState(isNight());
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
			<div class="fixed bottom-0 left-0 text-center mb-10 w-full">
				<button
					type="button"
					onClick={() => {
						const newNight = !night;
						setNight(newNight);
						applyTheme(newNight);
					}}
					class="inline-block rounded-md  px-3 py-1 text-sm text-zinc-700 transition hover:bg-zinc-200 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
				>
					{night ? (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="size-5"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="4" />
								<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
							</svg>
						) : (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="size-5"
								aria-hidden="true"
							>
								<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
							</svg>
						)}
				</button>
			</div>
		</div>
	);
}
