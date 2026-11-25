import type { JSONValue, RPC } from "@ezenki/deploy-commander-installer-interface";
import type { RunnerMetadata } from "./runner-types.js";

export type ResourceFilters = RPC.GetResourcesOptions;
export type ResourceSummary = RPC.ResourceItem;
export type ResourcePage = RPC.GetResources;
export type OwnedResource = Omit<RPC.CheckedGetResource, "config"> & {
  config: RPC.CheckedResourceConfiguration;
};

export type ConnectionFilters = RPC.GetConnectionsOptions;
export type MyConnectionFilters = Omit<ConnectionFilters, "manager"> & {
  manager?: never;
};
export type ConnectionSummary = RPC.ConnectionItem;
export type ConnectionPage = RPC.GetConnections;
export type ConnectionDetail = RPC.CheckedGetConnection;

export interface CreateConnectionConfig {
  metadata: JSONValue;
  managerId: string;
  resourceId: string;
  external: boolean;
  labels?: RPC.Labels;
}

export type CreatedConnection = Omit<RPC.CreateConnection, "config"> & {
  config: Omit<RPC.ConnectionConfiguration, "metadata"> & {
    metadata: unknown;
  };
};

export type LastRunFilters = NonNullable<
  Parameters<RPC.CheckedRPCCaller["getLatestRun"]>[0]
>;
export type RunSummary = RPC.CheckedRunItem;
export type RunStarted = RPC.StartResponse;

export interface StartRunConfig {
  action: string;
  sub_queue?: string;
  metadata?: RunnerMetadata | null;
  note?: string;
  platform_data?: JSONValue;
  config?: JSONValue;
  target?: RPC.RunTarget;
  labels?: RPC.Labels;
  secrets?: Record<string, string>;
  runner?: never;
  platform?: never;
  manager?: never;
  run?: never;
}

export interface CoreActions {
  startRun(config: StartRunConfig): Promise<RunStarted>;
  getLastRun(filters?: LastRunFilters): Promise<RunSummary | null>;
  getResources(filters: ResourceFilters): Promise<ResourcePage>;
  getResource(id: string): Promise<ResourceSummary | null>;
  getMyResource(id: string): Promise<OwnedResource>;
  getConnections(filters: ConnectionFilters): Promise<ConnectionPage>;
  getMyConnections(filters: MyConnectionFilters): Promise<ConnectionPage>;
  getResourceConnections(resourceId: string): Promise<ConnectionSummary[]>;
  getConnection(id: string): Promise<ConnectionDetail>;
  connectionExists(resourceId: string, managerId: string): Promise<boolean>;
  createConnection(config: CreateConnectionConfig): Promise<CreatedConnection>;
  deleteConnection(id: string): Promise<void>;
}
