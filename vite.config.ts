import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	root: "src/client",
	plugins: [preact(), tailwindcss()],
	build: {
		outDir: "../../dist/client",
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		proxy: {
			// `bun run dev` (wrangler dev) serves the API on 8787.
			"/api": "http://localhost:8787",
		},
	},
});
