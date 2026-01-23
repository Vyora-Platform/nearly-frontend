import { createRoot } from "react-dom/client";
// Polyfill global for libraries like SockJS (requires global to be defined)
if (typeof window !== 'undefined' && !(window as any).global) {
    (window as any).global = window;
}

import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
