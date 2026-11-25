import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [error, setError] = useState("");
  async function request(method: "GET" | "PUT") {
    setError(""); setResult(null); setHasResult(false);
    try {
      const response = await fetch(`/api/value?key=${encodeURIComponent(key)}`, { method, ...(method === "PUT" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) } : {}) });
      if (!response.ok) throw new Error(await response.text() || `Request failed (${response.status})`);
      if (method === "GET") { const data: unknown = await response.json(); if (data !== null && typeof data !== "string") throw new Error("Invalid response"); setResult(data); setHasResult(true); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Request failed"); }
  }
  return <main><h1>Dumb Cache Setter</h1><label>Key<input value={key} onChange={e => setKey(e.target.value)} /></label><label>String value<input value={value} onChange={e => setValue(e.target.value)} /></label><div><button onClick={() => void request("PUT")}>Set value</button><button onClick={() => void request("GET")}>Get value</button></div>{hasResult && <output>{JSON.stringify(result)}</output>}{error && <p role="alert">{error}</p>}</main>;
}
createRoot(document.getElementById("root")!).render(<App />);
