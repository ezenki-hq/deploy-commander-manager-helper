import { RPC, type Wire } from "@ezenki/deploy-commander-installer-interface";
import { createCoreActions } from "../actions.js";
import { requiredId } from "../input-validation.js";
import type { ConnectionSummary } from "../action-types.js";
import type { ConnectionProviderContext, ConnectionProviderSession, ConnectionSettings, DeleteProviderConnection, PrepareConnection } from "./types.js";
import { isCreateConnectionInterfaceMetadata, requiredConnectionId } from "./protocol.js";

const PAGE_SIZE = 50;
async function getConnectionRows(wire: Wire, resourceId: string, managerId: string): Promise<ConnectionSummary[]> {
  const checked = RPC.SetupCheckedRPCCaller(wire);
  const rows: ConnectionSummary[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  while (offset < total) {
    const page = await checked.getConnections({ resource: resourceId, manager: managerId, limit: PAGE_SIZE, offset });
    if (page.offset !== offset || !Number.isSafeInteger(page.total) || page.total < 0 || (!page.items.length && offset < page.total)) throw new TypeError("Malformed connection page");
    if (page.items.some((item) => item.resource !== resourceId || item.manager !== managerId || !item.id.trim())) throw new TypeError("Connection page contains an unauthorized row");
    rows.push(...page.items);
    total = page.total;
    offset += page.items.length;
  }
  return rows;
}
export async function openConnectionProviderSession(wire: Wire, signal?: AbortSignal): Promise<ConnectionProviderSession> {
  const caller = RPC.SetupRPCCaller(wire);
  const core = createCoreActions(wire);
  let managerId: string | null | undefined;
  let callingManagerId: string | null | undefined;
  const checkAbort = () => { if (signal?.aborted) throw new DOMException("Connection setup aborted", "AbortError"); };
  let resourceId: string;
  let resource: Awaited<ReturnType<typeof core.getMyResource>>;
  let existingConnections: ConnectionSummary[];
  try {
    managerId = await caller.getManager();
    requiredId(managerId, "current manager ID");
    checkAbort();
    callingManagerId = await caller.getCallingManager();
    requiredId(callingManagerId, "calling manager ID");
    if (callingManagerId === managerId) throw new TypeError("Calling manager must be different from the resource owner");
    checkAbort();
    const metadata = await caller.getMetadata();
    if (!isCreateConnectionInterfaceMetadata(metadata)) throw new TypeError("Invalid connection invocation metadata");
    resourceId = metadata.resourceId;
    requiredId(resourceId, "resource ID");
    checkAbort();
    resource = await core.getMyResource(resourceId);
    checkAbort();
    if (resource.resource.manager !== managerId || resource.resource.id !== resourceId) throw new Error("Resource is not owned by this manager");
    existingConnections = await getConnectionRows(wire, resourceId, callingManagerId);
    checkAbort();
  } catch (error) {
    if (!signal?.aborted && managerId && callingManagerId) {
      try { wire.close({ manager: managerId, ok: false, error: { message: error instanceof Error ? error.message : "Connection setup failed" } }); } catch { /* Keep the initialization error as the primary failure. */ }
    }
    throw error;
  }
  const trustedManagerId = managerId;
  const trustedCallingManagerId = callingManagerId;
  const trustedResourceId = resourceId;
  const context: ConnectionProviderContext = { resource, callingManagerId: trustedCallingManagerId, get existingConnections() { return existingConnections; } };
  let busy = false;
  let terminal = false;
  return {
    context,
    async create<T extends object>(settings: Readonly<T>, prepare: PrepareConnection<T>): Promise<void> {
      if (busy || terminal) throw new Error("Connection session is already handling an operation");
      busy = true;
      try {
        const duplicateCheck = await core.getConnections({ resource: trustedResourceId, manager: trustedCallingManagerId, limit: 1, offset: 0 });
        if (!Number.isSafeInteger(duplicateCheck.total)) throw new TypeError("Invalid connection count");
        const prepared: ConnectionSettings = await prepare(settings, context);
        const created = await core.createConnection({ metadata: prepared.metadata, managerId: trustedCallingManagerId, resourceId: trustedResourceId, external: prepared.external ?? false, labels: prepared.labels });
        const connection = created?.connection;
        if (!connection || typeof connection.id !== "string" || !connection.id.trim() || connection.manager !== trustedCallingManagerId || connection.resource !== trustedResourceId) {
          terminal = true;
          wire.close({ manager: trustedManagerId, ok: false, error: { message: "Connection RPC returned mismatched connection details" } });
          return;
        }
        terminal = true;
        wire.close({ manager: trustedManagerId, ok: true, result: { kind: "created", resourceId: trustedResourceId, connectionId: connection.id } });
      } finally { busy = false; }
    },
    async delete(connectionId: string, handler: DeleteProviderConnection): Promise<readonly ConnectionSummary[]> {
      if (busy || terminal) throw new Error("Connection session is already handling an operation");
      requiredConnectionId(connectionId);
      const connection = existingConnections.find((item) => item.id === connectionId && item.manager === trustedCallingManagerId && item.resource === trustedResourceId);
      if (!connection) throw new Error("Connection is not authorized for this invocation");
      busy = true;
      try {
        await handler(connection, context);
        const refreshed = await getConnectionRows(wire, trustedResourceId, trustedCallingManagerId);
        existingConnections = refreshed;
        return refreshed;
      } finally { busy = false; }
    },
    cancel() {
      if (busy || terminal) return;
      terminal = true;
      wire.close({ manager: trustedManagerId, ok: true, result: { kind: "cancelled" } });
    },
  };
}
