import { useEffect, useRef, useState } from "react";
import { createConnectionConsumerActions, createConnectionSelectionController } from "@ezenki/deploy-commander-manager-sdk-core";
import { ConfigurationSection } from "./ConfigurationSection.js";
import { SectionStatus } from "./SectionStatus.js";
import type { ConnectionSectionProps } from "./connection-types.js";
import type { ConnectionSelectionController, ConnectionSelectionState } from "@ezenki/deploy-commander-manager-sdk-core";

const initial: ConnectionSelectionState = { resources: [], resourceId: undefined, connections: [], selected: [], connectionIds: [], canAdd: true, loading: true, status: { kind: "loading" } };
export function ConnectionSection(props: ConnectionSectionProps) {
  const [state, setState] = useState(initial);
  const [search, setSearch] = useState("");
  const controller = useRef<ConnectionSelectionController | undefined>(undefined);
  useEffect(() => {
    const next = createConnectionSelectionController(createConnectionConsumerActions(props.wire), setState);
    controller.current = next;
    next.configure(props);
    return () => { next.dispose(); if (controller.current === next) controller.current = undefined; };
  }, [props.wire]);
  useEffect(() => { controller.current?.configure(props); }, [props.resource, props.maxConnections, props.data, props.initialData, props.onDataChange, props.onSelectionChange, props.onDeleteConnection]);
  const status = state.status.kind === "error" || state.status.kind === "pending" || state.status.kind === "success" ? state.status : undefined;
  return <ConfigurationSection title={props.title ?? "Connections"} description={props.description} initialData={{ connectionIds: [] }} className={props.className}>
    {() => <div className="space-y-4">
      <label className="dcmsdk-field"><span className="dcmsdk-label">Search resources</span><input className="dcmsdk-input" aria-label="Search resources" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Name or resource ID" /></label>
      <label className="dcmsdk-field"><span className="dcmsdk-label">Resource</span>
        <select aria-label="Resource" className="dcmsdk-input" value={state.resourceId ?? ""} onChange={(event) => controller.current?.chooseResource(event.currentTarget.value)} disabled={state.loading}>
          {state.resources.filter((resource) => `${resource.name} ${resource.id}`.toLowerCase().includes(search.toLowerCase())).map((resource) => <option key={resource.id} value={resource.id}>{resource.name} · {resource.type} · {resource.id}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        {state.connections.map((connection) => <button type="button" key={connection.id} className="dcmsdk-button dcmsdk-button-secondary" disabled={!state.canAdd || state.connectionIds.includes(connection.id) || state.loading} onClick={() => controller.current?.select(connection.id)}>Select {connection.id}</button>)}
        {state.selected.map((connection) => <span key={connection.id} className="inline-flex items-center gap-2 rounded-full border border-dcmsdk-border bg-dcmsdk-raised px-3 py-1 text-sm">{connection.id}<button type="button" aria-label={`Remove ${connection.id}`} className="text-dcmsdk-muted" onClick={() => controller.current?.remove(connection.id)}>×</button>{props.onDeleteConnection && <button type="button" className="dcmsdk-button dcmsdk-button-danger" onClick={() => void controller.current?.delete(connection.id)}>Delete</button>}</span>)}
      </div>
      {state.canAdd && <button type="button" className="dcmsdk-button dcmsdk-button-primary" disabled={state.loading || !state.resourceId} onClick={() => void controller.current?.create()}>Create Connection</button>}
      {state.notice && <p role="status">{state.notice}</p>}
      {status && <SectionStatus status={status} />}
    </div>}
  </ConfigurationSection>;
}
