import "dotenv/config";
import { createApp } from "./app.ts";
import { log } from "./log.ts";

const PORT = Number(process.env.PORT ?? 3004);
const { app } = createApp();

app.listen(PORT, () => {
	log.success(`bible on port ${PORT}`);
});
