import { render } from "preact";
import { App } from "./components/App.tsx";
import "./styles.css";

const root = document.getElementById("app");
if (!root) throw new Error("#app root element missing");
render(<App />, root);
