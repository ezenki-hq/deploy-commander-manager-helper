import React from "react";
import { createRoot } from "react-dom/client";
import type { Wire } from "@ezenki/deploy-commander-installer-interface";
import { ConfigurationSection, CreateConnectionSection, ManagerInvocationSection } from "@ezenki/deploy-commander-manager-sdk-react";
import "@ezenki/deploy-commander-manager-sdk-react/styles.css";
import { CACHE_URL, parseCacheMetadata } from "../../shared/cache-contract.js";
import { buildCacheInstall, buildCacheTeardown } from "./deployment.js";

declare global { interface Window { deployCommanderWire?: Wire } }
const wire = window.deployCommanderWire;
function App() {
  if (!wire) return <p>Open this manager inside Deploy Commander.</p>;
  return <ManagerInvocationSection wire={wire} definition={{ parseMetadata: value => value }} standalone={() => <ConfigurationSection title="Dumb Cache" description="Install or remove the in-memory cache resource." initialData={{ action: "install" }} actions={{ install: { label: "Install", execute: async ({ coreActions }) => { await coreActions!.startRun(buildCacheInstall()); } }, teardown: { label: "Tear down", variant: "danger", execute: async ({ coreActions }) => { await coreActions!.startRun(buildCacheTeardown); } } }} coreActions={createActions(wire)}>{() => <p>Cache runs through Deploy Commander.</p>}</ConfigurationSection>} called={context => parseCacheMetadata(context.metadata).url === CACHE_URL ? <CreateConnectionSection wire={wire} title="Connect to Dumb Cache" initialSettings={() => ({})} onCreateConnection={() => ({ metadata: { url: CACHE_URL } })}>{() => <p>Allow the calling manager to connect to the in-memory cache.</p>}</CreateConnectionSection> : <ConfigurationSection title="Invalid connection request" initialData={{}} actions={{ reject: { label: "Return failure", variant: "danger", execute: () => context.fail({ message: "Invalid Dumb Cache invocation metadata" }) } }}>{() => <p>The resource request could not be validated.</p>}</ConfigurationSection>} />;
}
import { createCoreActions } from "@ezenki/deploy-commander-manager-sdk-core";
const createActions = createCoreActions;
createRoot(document.getElementById("root")!).render(<App />);
