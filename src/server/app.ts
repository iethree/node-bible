import { existsSync } from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import morgan from "morgan";
import favicon from "serve-favicon";
import { createBible } from "./bible.ts";
import { createStore } from "./db.ts";
import { createApiRouter } from "./routes.ts";

export interface AppOptions {
	dbPath?: string;
	authToken?: string;
	clientDir?: string;
	publicDir?: string;
	enableLogger?: boolean;
	fetchImpl?: typeof fetch;
}

export function createApp(opts: AppOptions = {}) {
	const dbPath = opts.dbPath ?? path.resolve(process.cwd(), "data/bible.sqlite");
	const authToken = opts.authToken ?? process.env.ESVTOKEN ?? "";
	const clientDir = opts.clientDir ?? path.resolve(process.cwd(), "dist/client");
	const publicDir = opts.publicDir ?? path.resolve(process.cwd(), "public");
	const enableLogger = opts.enableLogger ?? process.env.NODE_ENV !== "test";

	const store = createStore(dbPath);
	const bible = createBible({ store, authToken, fetchImpl: opts.fetchImpl });

	const app = express();

	const faviconPath = path.join(publicDir, "favicon.png");
	if (existsSync(faviconPath)) app.use(favicon(faviconPath));
	if (enableLogger) app.use(morgan("dev"));

	app.use(express.json());
	app.use(express.urlencoded({ extended: false }));

	if (existsSync(publicDir)) app.use(express.static(publicDir));
	if (existsSync(clientDir)) app.use(express.static(clientDir));

	app.use("/api", createApiRouter({ bible }));

	app.get(/^\/(?!api\/).*/, (_req: Request, res: Response, next: NextFunction) => {
		const indexPath = path.join(clientDir, "index.html");
		if (!existsSync(indexPath)) {
			next();
			return;
		}
		res.sendFile(indexPath);
	});

	app.use((_req: Request, res: Response) => {
		res.status(404).json({ error: "Not Found" });
	});

	app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
		res.status(err.status ?? 500).json({ error: err.message });
	});

	return { app, store, bible };
}
