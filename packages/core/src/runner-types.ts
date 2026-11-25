import type { JSONValue, Labels } from "@ezenki/deploy-commander-installer-interface";

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

export interface RunnerOneTimeService extends RunnerServiceFields, RunnerJobOutput {
  role: "runner";
  depends_on?: string[] | null;
  fail_runner?: RunnerFailureService | null;
  resources?: never;
  health_check?: never;
}

export interface RunnerFailureService extends RunnerServiceFields, RunnerJobOutput {
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
