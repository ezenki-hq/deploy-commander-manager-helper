import { createCoreActions, type RunStarted, type StartRunConfig } from "@ezenki/deploy-commander-manager-sdk-core";
import type { Wire } from "@ezenki/deploy-commander-installer-interface";
import { CACHE_RESOURCE_NAME, CACHE_RESOURCE_TYPE, CACHE_URL, isCacheResource } from "../../shared/cache-contract.js";

export function buildSetterInstall(connectionId: string, resourceId: string, cacheUrl: string, hostPort: number): StartRunConfig {
  if (!connectionId.trim() || !resourceId.trim() || !Number.isSafeInteger(hostPort) || hostPort < 1 || hostPort > 65535 || cacheUrl !== CACHE_URL) throw new TypeError("Invalid cache connection or application port");
  return { action: "setup", metadata: { services: { "dumb-cache-setter": { image: "ezenki/dumb-cache-setter:latest", environment: { CACHE_URL: cacheUrl }, bindings: [{ container_port: 8080, host_port: hostPort, host_ip: "127.0.0.1" }], connections: [{ type: "Connection", data: { resource: resourceId, connection: connectionId } }] } } } };
}
export async function installSetter(wire: Wire, connectionId: string, hostPort: number): Promise<RunStarted> {
  const actions = createCoreActions(wire);
  const managerId = await (await import("@ezenki/deploy-commander-installer-interface")).RPC.SetupRPCCaller(wire).getManager();
  const detail = await actions.getConnection(connectionId);
  if (detail.connection.id !== connectionId || detail.connection.manager !== managerId || detail.config.manager !== managerId) throw new Error("Connection is not owned by this manager");
  const resource = await actions.getResource(detail.connection.resource);
  if (!resource || !isCacheResource(resource) || resource.manager === managerId || detail.connection.external !== false || detail.config.metadata === null || typeof detail.config.metadata !== "object" || (detail.config.metadata as { url?: unknown }).url !== CACHE_URL || !detail.config.platform_connection) throw new Error("Selected connection is not a valid Dumb Cache connection");
  if (resource.type !== CACHE_RESOURCE_TYPE || resource.name !== CACHE_RESOURCE_NAME) throw new Error("Unexpected cache resource");
  return actions.startRun(buildSetterInstall(connectionId, resource.id, CACHE_URL, hostPort));
}
export const buildSetterTeardown: StartRunConfig = { action: "teardown" };
