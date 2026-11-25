# Deploy Commander Manager SDK core actions

Expose `createCoreActions(wire)` and its `CoreActions` type from the core package. The factory takes a manager's existing installer-interface `Wire` and creates the upstream checked and ordinary callers over it. It does not own wire creation or disposal. Managers can compose these actions into their own action maps without replacing the underlying integration. The published installer interface at `0.8.1` supplies the RPC types and behavior. [Manager interface guide](../../integrations/MANAGER_INTERFACE_GUIDE.md) · [Runner implementation guide](../../integrations/DEPLOYMENT_RUNNER_IMPLEMENTATION_GUIDE.md)

A factory bound to the wire keeps trusted context with Deploy Commander and lets unit tests use real caller implementations over a scripted wire. A factory that accepts arbitrary substitute callers would add a second integration surface and make it easier to skip checked reads.

## Public TypeScript contract

These declarations are the core package's public API. The installer-interface aliases track the published RPC contracts. `ResourceSummary` contains the list result's resource fields. `OwnedResource` also exposes the configuration that only the owning manager can read.

```ts
import type {
  JSONValue,
  Labels,
  RPC,
  RunTarget,
  Wire,
} from "@ezenki/deploy-commander-installer-interface";

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
  labels?: Labels;
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
  target?: RunTarget;
  labels?: Labels;
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

export declare function createCoreActions(wire: Wire): CoreActions;
```

## Runner metadata TypeScript contract

The metadata types use the JSON field names supplied to the runner. `RunnerScheduledService` has the fields available to chronjob services. The service role determines which lifecycle and health fields a regular service can use. Templates are strings in the positions documented by the runner and are resolved there. `scale` carries compatibility data. The Docker runner guide documents which fields affect execution. [Runner metadata and service definitions](../../integrations/DEPLOYMENT_RUNNER_IMPLEMENTATION_GUIDE.md#metadata-structure)

```ts
export interface RunnerMetadata {
  values_version?: 1 | null;
  services?: Record<string, RunnerService> | null;
  service_commands?: RunnerServiceCommand[] | null;
  chronjobs?: Record<string, RunnerChronjob> | null;
  remove_chronjobs?: string[] | null;
  config_maps?: Record<string, Record<string, string>> | null;
  remove_services?: string[] | null;
  volumes?: string[] | null;
  remove_volumes?: string[] | null;
  connections?: RunnerConnectionPlan | null;
  redirect?: { redirect: string | null } | null;
  object_hooks?: RunnerObjectHook[] | null;
}

export interface RunnerScheduledService {
  image: string;
  command?: string[] | null;
  environment?: Record<string, string> | null;
  volumes?: RunnerMount[] | null;
  config_maps?: RunnerMount[] | null;
  network_groups?: string[] | null;
  connections?: RunnerServiceConnection[] | null;
}

export interface RunnerChronjob {
  timer: string;
  services: Record<string, RunnerScheduledService>;
}

interface RunnerServiceFields extends RunnerScheduledService {
  aliases?: string[] | null;
  bindings?: RunnerPortBinding[] | null;
  scale?: RunnerScale | null;
  save_secrets?: RunnerSecretWrite[] | null;
}

interface RunnerJobOutput {
  capture_variables?: RunnerVariableCapture[] | null;
  stream_output?: boolean | null;
}

export interface RunnerLongRunningService extends RunnerServiceFields {
  role?: "service" | null;
  depends_on?: string[] | null;
  resources?: RunnerProducedResource[] | null;
  health_check?: RunnerHealthCheck | null;
  capture_variables?: never;
  stream_output?: never;
  fail_runner?: never;
}

export interface RunnerOneTimeService
  extends RunnerServiceFields, RunnerJobOutput {
  role: "runner";
  depends_on?: string[] | null;
  fail_runner?: RunnerFailureService | null;
  resources?: never;
  health_check?: never;
}

export interface RunnerFailureService
  extends RunnerServiceFields, RunnerJobOutput {
  role?: "runner" | null;
  depends_on?: never;
  fail_runner?: never;
  resources?: never;
  health_check?: never;
}

export type RunnerService = RunnerLongRunningService | RunnerOneTimeService;

export interface RunnerServiceCommand {
  service: string;
  command: string[];
}

export interface RunnerMount {
  name: string;
  mount_path: string;
}

export interface RunnerPortBinding {
  container_port?: number | null;
  host_port?: number | null;
  host_ip?: string | null;
}

export interface RunnerScale {
  mode: "single" | "autoscale" | "autoscale-core" | "global";
  min?: number | null;
  max?: number | null;
}

export interface RunnerHealthCheck {
  test: string[];
  interval_seconds?: number;
  timeout_seconds?: number;
  start_period_seconds?: number;
  retries?: number;
  wait_timeout_seconds?: number;
  log_health_output?: boolean;
  log_container_output?: boolean | null;
}

export interface RunnerVariableCapture {
  stream: "stdout" | "stderr";
  pattern: string;
}

export interface RunnerPublicConnection {
  address?: string;
  port?: number;
}

export interface RunnerProducedResource {
  resource_type: string;
  name: string;
  metadata: JSONValue;
  public_connection?: RunnerPublicConnection | null;
  labels?: Labels;
  secrets?: string[];
}

export type RunnerServiceConnection =
  | { type: "Connection"; data: { resource: string; connection?: string } }
  | { type: "Platform"; data: { network: string } }
  | { type: "Network"; data: { address: string; port: number } };

export interface RunnerConnectionPlan {
  create?: RunnerConnectionCreate[] | null;
  remove?: RunnerConnectionRemove[] | null;
}

export interface RunnerConnectionCreate {
  name?: string;
  manager: string;
  resource: { id: string };
  metadata: JSONValue;
  labels?: Labels;
  secrets?: string[];
}

export interface RunnerConnectionRemove {
  name?: string;
  id: string;
  resource: { id: string };
}

export type RunnerSecretOwner =
  | { kind: "manager" | "run"; id?: never; name?: never; service?: never }
  | { kind: "resource" | "connection"; id: string; name?: never; service?: never }
  | { kind: "resource"; service: string; name: string; id?: never }
  | { kind: "connection"; name: string; id?: never; service?: never };

export interface RunnerSecretWrite {
  owner: RunnerSecretOwner;
  key: string;
  value: string;
}

export interface RunnerHookQuery {
  query: string;
  bindings?: Record<string, JSONValue>;
}

export interface RunnerOperationHooks {
  before?: RunnerHookQuery | null;
  after?: RunnerHookQuery | null;
  failure?: RunnerHookQuery | null;
}

export interface RunnerObjectHook {
  kind: "container" | "volume" | "network" | "resource" | "connection";
  name: string;
  create?: RunnerOperationHooks | null;
  remove?: RunnerOperationHooks | null;
}
```

## Reads and connection mutations

| Action | Contract |
| --- | --- |
| `getLastRun(filters?)` | Call checked `getLatestRun`. Return its checked run summary or `null`. Derive filter types from the published checked caller. |
| `getResources(filters)` | Pass the upstream options object to checked `getResources` and return the summary page, including pagination metadata. |
| `getResource(id)` | Search checked resource pages for an exact ID. Return one resource summary or `null` after the last page. There is no supported resource-ID list filter. |
| `getMyResource(id)` | Use checked singular `getResource` and return its resource and non-null configuration. Report missing configuration as an error. |
| `getConnections(filters)` | Pass the upstream options object to checked `getConnections` and return the authorized summary page. |
| `getMyConnections(filters)` | Use ordinary `getManager` to resolve current identity, then use checked `getConnections` with that manager filter. Other filters still apply. The public filter type excludes a caller-selected manager. |
| `getResourceConnections(resourceId)` | Use checked singular `getResource` to establish ownership, then return all checked connection summaries for that resource in server page order. Ownership depends on the successful resource read. Configuration is required only for `getMyResource`. |
| `getConnection(id)` | Return the checked detail, including any optional live descriptors on its configuration. |
| `connectionExists(resourceId, managerId)` | Use checked `getConnections` with `resource`, `manager`, `limit: 1`, and `offset: 0`. Return whether the filtered total is greater than zero. |
| `createConnection(config)` | Call ordinary `createConnection` with `metadata`, connection-owning `managerId`, `external`, `resourceId`, and optional `labels`. Deploy Commander authorizes the resource owner. The request proceeds independently of any existing pair. |
| `deleteConnection(id)` | Call ordinary `deleteConnection` with only the ID. Deploy Commander makes the authorization decision. |

Read DTOs reuse the upstream types and distinguish resource summary from owned detail. Custom metadata from reads and the ordinary creation result is exposed as `unknown`. Preserve checked errors, including status and kind, and let ordinary RPC failures propagate in their original shape. A missing result from an exhaustive scan is an ordinary outcome. An RPC rejection, including an explicit 404 or 403 from a scoped detail call, remains a rejection.

For list scans, request pages of 50 and advance by the returned item count so capped or partial pages work. Stop after reaching the reported total. Fail if the returned offset differs from the requested one or the response has no items despite reporting remaining items. Match singular detail IDs to the requested ID for SDK-level consistency. Validate required IDs as nonblank strings without surrounding whitespace and pagination as safe integer limits greater than zero and offsets at least zero. Validate known filter fields using the published option types, preserving false values and label selection. Do not reinterpret run status filters. The package declarations currently use string arrays for them.

## Starting runs

`startRun(config)` calls ordinary `start` with the options-object overload. The SDK sets `runner` to `ezenki/deploy-commander-runner:latest` and `platform` to `docker`. The runner accepts a nonblank action name for setup and reconciliation and treats the exact name `teardown` specially. The SDK validates the options and forwards documented optional fields, including run target, manager-owned JSON configuration, labels, and secrets. Queue names use the guide's UTF-8 byte limit and whitespace and control-character rules. Teardown uses the main queue and needs no metadata. The manager chooses which state-changing operation to plan. Trusted run ID and current-manager identity are assigned by Deploy Commander.

`RunnerMetadata` uses the guide's JSON names and types for supported sections. Local validation covers JSON safety and the guide's minimum checks for service images and keys, dependency references and cycles, mounts, resource names and types, ports and host IPs, resource and connection references, removals, and conflicting create/remove intent. Respect the guide's restrictions for scheduled services and distinguish omitted values, empty arrays, and a redirect explicitly set to `null`. Runner-specific execution checks and live authorization remain with the platform. The SDK passes metadata through after validation and never generates a deployment plan.

## Acceptance criteria

- Every requested action is exported through the typed factory and uses the published installer-interface callers.
- Unit tests exercise actual wire requests, malformed input and responses, missing summaries, page traversal, ownership gates, scoped rejection, and independent creation of multiple connections for the same pair.
- Successful and rejected starts cover the fixed runner and platform, teardown, queue handling, and representative valid and invalid deployment metadata.
- `npm ci` and `npm run build` pass, including strict type checking, ESLint, and the core tests. The change is limited to core actions, supporting types and validation, tests, and the necessary package dependency.
