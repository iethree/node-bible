// Shared setup for client tests. Import this as the first import in any client
// test file to get a working DOM + IndexedDB inside Bun's test runner.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (typeof globalThis.window === "undefined") {
	GlobalRegistrator.register();
}

import "fake-indexeddb/auto";
