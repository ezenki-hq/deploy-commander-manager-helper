import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import type { Wire } from "@ezenki/deploy-commander-installer-interface";
import { ConfigurationSection, ConnectionSection } from "@ezenki/deploy-commander-manager-sdk-react";
import "@ezenki/deploy-commander-manager-sdk-react/styles.css";
import { createCoreActions } from "@ezenki/deploy-commander-manager-sdk-core";
import { installSetter, buildSetterTeardown } from "./deployment.js";

declare global { interface Window { deployCommanderWire?: Wire } }
function App() {
  const wire = window.deployCommanderWire;
  const [ids, setIds] = useState<readonly string[]>([]);
  const [port, setPort] = useState(8081);
  if (!wire) return <p>Open this manager inside Deploy Commander.</p>;
  const actions = createCoreActions(wire);
  return <><ConnectionSection wire={wire} resource={{ filters: { type: "dumb-cache", external: false } }} data={{ connectionIds: ids }} onDataChange={data => setIds(data.connectionIds)} onSelectionChange={setIds} /><ConfigurationSection title="Dumb Cache Setter" description="Install the cache client and open its local web interface." initialData={{}} coreActions={actions} actions={{ install: { label: "Install Setter", execute: async () => { if (ids.length !== 1) throw new Error("Select one cache connection"); await installSetter(wire, ids[0]!, port); } }, teardown: { label: "Tear down", variant: "danger", execute: async ({ coreActions }) => { await coreActions!.startRun(buildSetterTeardown); } } }}>{() => <label>Local port<input type="number" min="1" max="65535" value={port} onChange={event => setPort(Number(event.target.value))} /></label>}</ConfigurationSection></>;
}
createRoot(document.getElementById("root")!).render(<App />);
