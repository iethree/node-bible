import { createApp } from "./app.ts";

export interface Env {
	DB: D1Database;
	ESVTOKEN: string;
}

export default {
	fetch(req, env) {
		return createApp({ db: env.DB, authToken: env.ESVTOKEN })(req);
	},
} satisfies ExportedHandler<Env>;
