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
			"/api": "http://localhost:3004",
		},
	},
});
