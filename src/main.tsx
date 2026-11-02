import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

if (new URLSearchParams(window.location.search).has("bake")) {
  import("./avatar/bake").then((m) => m.runBake());
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
