import { useEffect, useState } from "react";
import { openConnectionProviderSession } from "@ezenki/deploy-commander-manager-sdk-core";
import type { ConnectionProviderContext, ConnectionProviderSession } from "@ezenki/deploy-commander-manager-sdk-core";
import { ConfigurationSection } from "./ConfigurationSection.js";
import type { CreateConnectionSectionProps } from "./connection-types.js";

export function CreateConnectionSection<TSettings extends object>(props: CreateConnectionSectionProps<TSettings>) {
  const [session, setSession] = useState<ConnectionProviderSession>();
  const [context, setContext] = useState<ConnectionProviderContext>();
  const [settings, setSettings] = useState<TSettings>();
  const [status, setStatus] = useState<{ kind: "loading" | "error" | "pending" | "idle"; error?: unknown; label?: string }>({ kind: "loading" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setStatus({ kind: "loading" });
    void openConnectionProviderSession(props.wire, abort.signal).then((opened) => {
      if (abort.signal.aborted) return;
      const initialSettings = props.initialSettings(opened.context);
      setSession(opened); setContext(opened.context); setSettings(initialSettings); setStatus({ kind: "idle" });
    }).catch((error: unknown) => { if (!abort.signal.aborted) setStatus({ kind: "error", error }); });
    return () => abort.abort();
  }, [props.wire]);
  return <ConfigurationSection<TSettings> title={props.title ?? "Create Connection"} description={props.description} data={settings} onDataChange={(next) => setSettings(next)} loading={status.kind === "loading" || status.kind === "pending"} error={status.kind === "error" ? status.error : undefined} className={props.className} data-revision={revision}>
    {(section) => context && <div className="space-y-4">
      <p>Connect as <strong>{context.callingManagerId}</strong> to <strong>{context.resource.resource.name}</strong>.</p>
      {props.children({ ...section, data: section.data, setData: section.setData, ...context })}
      {context.existingConnections.length > 0 && <ul aria-label="Existing connections">{context.existingConnections.map((connection) => <li key={connection.id}>{connection.id}{props.onDeleteConnection && <button type="button" className="dcmsdk-button dcmsdk-button-danger" onClick={() => void session?.delete(connection.id, props.onDeleteConnection!).then(() => setRevision((n) => n + 1)).catch((error: unknown) => setStatus({ kind: "error", error }))}>Delete</button>}</li>)}</ul>}
      <div className="flex gap-2">
        <button type="button" className="dcmsdk-button dcmsdk-button-primary" disabled={status.kind === "pending" || status.kind === "loading"} onClick={() => { setStatus({ kind: "pending", label: "Creating connection" }); void session?.create(section.data, props.onCreateConnection).then(() => setStatus({ kind: "idle" })).catch((error: unknown) => setStatus({ kind: "error", error })); }}>Create Connection</button>
        <button type="button" className="dcmsdk-button dcmsdk-button-secondary" disabled={status.kind === "pending" || status.kind === "loading"} onClick={() => session?.cancel()}>Cancel</button>
      </div>
    </div>}
  </ConfigurationSection>;
}
