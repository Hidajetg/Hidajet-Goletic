import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

function showFatalError(title: string, error: unknown) {
  const root = document.getElementById("root");

  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}\n\n${error.stack || ""}`
      : String(error);

  if (root) {
    root.innerHTML = `
      <div style="
        min-height:100vh;
        background:#000;
        color:#fff;
        padding:24px;
        font-family:Arial, sans-serif;
        box-sizing:border-box;
      ">
        <h1 style="color:#ff6b00;font-size:24px;margin-bottom:16px;">
          ${title}
        </h1>
        <pre style="
          white-space:pre-wrap;
          word-break:break-word;
          background:#111;
          border:1px solid #ff6b00;
          border-radius:12px;
          padding:16px;
          font-size:13px;
          line-height:1.45;
        ">${message}</pre>
      </div>
    `;
  }
}

window.addEventListener("error", (event) => {
  showFatalError("JavaScript greška u Android aplikaciji", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  showFatalError("Promise greška u Android aplikaciji", event.reason);
});

try {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  showFatalError("React aplikacija se nije mogla pokrenuti", error);
}