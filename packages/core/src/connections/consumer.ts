import type { Wire } from "@ezenki/deploy-commander-installer-interface";
import { createCoreActions } from "../actions.js";
import type { ResourceSummary } from "../action-types.js";
import { isCreateConnectionInterfaceMetadata, parseCreateConnectionResult, requiredConnectionId } from "./protocol.js";
import type { ConnectionConsumerActions, ConnectionResourceQuery } from "./types.js";

const PAGE_SIZE = 50;
async function allPages<T>(read: (offset: number) => Promise<{ items: T[]; offset: number; total: number }>): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  while (offset < total) {
    const page = await read(offset);
    if (page.offset !== offset || !Number.isSafeInteger(page.total) || page.total < 0) throw new TypeError("Malformed paginated RPC response");
    if (!page.items.length && offset < page.total) throw new TypeError("Malformed empty RPC page");
    items.push(...page.items);
    total = page.total;
    offset += page.items.length;
  }
  return items;
}
async function listResources(core: ReturnType<typeof createCoreActions>, query: ConnectionResourceQuery): Promise<ResourceSummary[]> {
  if ("resourceId" in query && query.resourceId) {
    const resource = await core.getResource(query.resourceId);
    return resource ? [resource] : [];
  }
  const filters = query.filters ?? {};
  return allPages((offset) => core.getResources({ ...filters, limit: PAGE_SIZE, offset }));
}
async function currentManager(wire: Wire): Promise<string> {
  const { result, ok, error } = await wire.sendRPC({ request: "getManager", payload: {} });
  if (!ok || typeof result !== "string" || !result.trim()) throw new Error(error?.message ?? "Invalid current manager identity");
  return result;
}
export function createConnectionConsumerActions(wire: Wire): ConnectionConsumerActions {
  const core = createCoreActions(wire);
  return {
    async getResources(query) { return listResources(core, query); },
    async getConnections(resourceId) {
      requiredConnectionId(resourceId);
      return allPages((offset) => core.getConnections({ resource: resourceId, limit: PAGE_SIZE, offset }));
    },
    async getConnection(id) {
      requiredConnectionId(id);
      const result = await core.getConnection(id);
      if (result.connection.id !== id) throw new TypeError("RPC returned a different connection ID");
      return result.connection;
    },
    async requestConnection(resourceId) {
      requiredConnectionId(resourceId);
      const resource = await core.getResource(resourceId);
      if (!resource) throw new Error("Resource is not accessible");
      const consumerManager = await currentManager(wire);
      if (resource.manager === consumerManager) throw new Error("Cannot request a connection to a resource owned by this manager");
      const child = await wire.startInterface({ manager: resource.manager, metadata: { purpose: "createConnection", resourceId } });
      const response = await child.close;
      if (response.manager !== resource.manager) throw new Error("Connection interface closed under a different manager");
      if (!response.ok) throw new Error(response.error?.message ?? "Connection interface failed");
      const result = parseCreateConnectionResult(response.result);
      if (result.kind === "cancelled") return result;
      if (result.resourceId !== resourceId) throw new Error("Connection interface returned a different resource");
      const [connections] = await Promise.all([
        allPages((offset) => core.getConnections({ resource: resourceId, manager: consumerManager, limit: PAGE_SIZE, offset })),
        listResources(core, { resourceId }),
      ]);
      const connection = connections.find((item) => item.id === result.connectionId);
      if (!connection || connection.resource !== resourceId || connection.manager !== consumerManager) throw new Error("Created connection is not present in authorized connections");
      return { kind: "created", connection, connections };
    },
    async deleteConnection(connectionId) { await core.deleteConnection(connectionId); },
  };
}
export { isCreateConnectionInterfaceMetadata };
