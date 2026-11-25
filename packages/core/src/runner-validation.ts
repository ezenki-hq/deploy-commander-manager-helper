import type { RunnerMetadata } from "./runner-types.js";

function validateJson(value: unknown, name: string, ancestors = new Set<object>()): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must contain finite JSON numbers`);
    return;
  }
  if (typeof value !== "object") throw new TypeError(`${name} must contain only JSON values`);
  if (ancestors.has(value)) throw new TypeError(`${name} must not contain circular references`);
  ancestors.add(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) validateJson(child, name, ancestors);
  ancestors.delete(value);
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a nonblank string`);
}

function uniqueStrings(value: unknown, name: string): string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const values = value.map((entry, index) => {
    string(entry, `${name}[${index}]`);
    return entry;
  });
  if (new Set(values).size !== values.length) throw new TypeError(`${name} must not contain duplicates`);
  return values;
}

function checkKeys(value: Record<string, unknown>, allowed: readonly string[], name: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new TypeError(`${name} has unsupported field ${key}`);
  }
}

function validateMounts(value: unknown, name: string): void {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const paths = new Set<string>();
  for (const [index, entry] of value.entries()) {
    const mount = record(entry, `${name}[${index}]`);
    string(mount.name, `${name}[${index}].name`);
    string(mount.mount_path, `${name}[${index}].mount_path`);
    if (!mount.mount_path.startsWith("/") || mount.mount_path.split("/").includes("..")) {
      throw new TypeError(`${name}[${index}].mount_path must be a clean absolute path`);
    }
    if (paths.has(mount.mount_path)) throw new TypeError(`${name} has duplicate mount paths`);
    paths.add(mount.mount_path);
  }
}

function validateCommand(value: unknown, name: string): void {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const command = value.map((entry, index) => {
    string(entry, `${name}[${index}]`);
    return entry;
  });
  if (command.length === 0) throw new TypeError(`${name} must not be empty`);
}

function validateScheduledService(value: unknown, name: string): void {
  const service = record(value, name);
  checkKeys(service, ["image", "command", "environment", "volumes", "config_maps", "network_groups", "connections"], name);
  string(service.image, `${name}.image`);
  validateMounts(service.volumes, `${name}.volumes`);
  validateMounts(service.config_maps, `${name}.config_maps`);
}

function validateReferenceId(value: unknown, name: string): void {
  string(value, name);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    throw new TypeError(`${name} must be a UUID`);
  }
}

export function validateRunnerMetadata(metadata: RunnerMetadata): void {
  const root = record(metadata, "metadata");
  validateJson(root, "metadata");
  checkKeys(root, [
    "values_version", "services", "service_commands", "chronjobs", "remove_chronjobs",
    "config_maps", "remove_services", "volumes", "remove_volumes", "connections",
    "redirect", "object_hooks",
  ], "metadata");
  if (root.values_version !== undefined && root.values_version !== null && root.values_version !== 1) {
    throw new TypeError("values_version must be 1 or null");
  }

  const services = root.services === undefined || root.services === null ? {} : record(root.services, "services");
  const serviceNames = Object.keys(services);
  const dependencies = new Map<string, string[]>();
  for (const [name, raw] of Object.entries(services)) {
    string(name, "service key");
    const service = record(raw, `services.${name}`);
    const common = ["image", "command", "environment", "volumes", "config_maps", "network_groups", "connections", "aliases", "bindings", "scale", "save_secrets"];
    const runner = service.role === "runner";
    checkKeys(service, runner
      ? [...common, "role", "depends_on", "resources", "capture_variables", "stream_output", "fail_runner"]
      : [...common, "role", "depends_on", "resources", "health_check"], `services.${name}`);
    string(service.image, `services.${name}.image`);
    validateCommand(service.command, `services.${name}.command`);
    for (const field of ["aliases", "network_groups"] as const) {
      if (service[field] !== undefined && service[field] !== null) uniqueStrings(service[field], `services.${name}.${field}`);
    }
    if (service.environment !== undefined && service.environment !== null) {
      const environment = record(service.environment, `services.${name}.environment`);
      for (const [key, value] of Object.entries(environment)) {
        string(key, `services.${name}.environment key`);
        if (typeof value !== "string") throw new TypeError(`services.${name}.environment values must be strings`);
      }
    }
    if (service.role !== undefined && service.role !== null && service.role !== "runner" && service.role !== "service") {
      throw new TypeError(`services.${name}.role is unsupported`);
    }
    if (service.role === "runner" && service.health_check !== undefined) {
      throw new TypeError(`services.${name}.health_check is not supported for runner services`);
    }
    if (service.role !== "runner" && (service.capture_variables !== undefined || service.stream_output !== undefined || service.fail_runner !== undefined)) {
      throw new TypeError(`services.${name} runner-only fields require role runner`);
    }
    validateMounts(service.volumes, `services.${name}.volumes`);
    validateMounts(service.config_maps, `services.${name}.config_maps`);
    const deps = service.depends_on === undefined || service.depends_on === null
      ? []
      : uniqueStrings(service.depends_on, `services.${name}.depends_on`);
    dependencies.set(name, deps);

    if (service.bindings !== undefined && service.bindings !== null) {
      if (!Array.isArray(service.bindings)) throw new TypeError(`services.${name}.bindings must be an array`);
      for (const [index, rawBinding] of service.bindings.entries()) {
        const binding = record(rawBinding, `services.${name}.bindings[${index}]`);
        for (const field of ["container_port", "host_port"] as const) {
          const port = binding[field];
          if (port !== undefined && port !== null && (!Number.isInteger(port) || (port as number) < 1 || (port as number) > 65535)) {
            throw new TypeError(`services.${name}.bindings[${index}].${field} is invalid`);
          }
        }
        if (binding.container_port === undefined && binding.host_port === undefined) {
          throw new TypeError(`services.${name}.bindings[${index}] must specify a port`);
        }
        if (binding.host_ip !== undefined && binding.host_ip !== null) {
          string(binding.host_ip, `services.${name}.bindings[${index}].host_ip`);
          if (!/^(?:\d{1,3}\.){3}\d{1,3}$/u.test(binding.host_ip) &&
              !/^[0-9a-f:]+$/iu.test(binding.host_ip)) {
            throw new TypeError(`services.${name}.bindings[${index}].host_ip must be an IP address`);
          }
        }
      }
    }
    if (service.resources !== undefined && service.resources !== null) {
      if (!Array.isArray(service.resources)) throw new TypeError(`services.${name}.resources must be an array`);
      for (const [index, rawResource] of service.resources.entries()) {
        const item = record(rawResource, `services.${name}.resources[${index}]`);
        string(item.resource_type, "resource_type");
        string(item.name, "resource name");
        validateJson(item.metadata, `services.${name}.resources[${index}].metadata`);
      }
    }
    if (service.connections !== undefined && service.connections !== null) {
      if (!Array.isArray(service.connections)) throw new TypeError(`services.${name}.connections must be an array`);
      for (const [index, rawConnection] of service.connections.entries()) {
        const connection = record(rawConnection, `services.${name}.connections[${index}]`);
        if (connection.type === "Connection") {
          const data = record(connection.data, "connection data");
          validateReferenceId(data.resource, "connection resource");
          if (data.connection !== undefined) validateReferenceId(data.connection, "connection ID");
        } else if (connection.type === "Platform") {
          const data = record(connection.data, "platform connection data");
          string(data.network, "platform network");
        } else if (connection.type === "Network") {
          const data = record(connection.data, "network connection data");
          string(data.address, "network address");
          if (!Number.isInteger(data.port) || (data.port as number) < 1 || (data.port as number) > 65535) {
            throw new TypeError("network connection port must be between 1 and 65535");
          }
        } else {
          throw new TypeError(`services.${name}.connections[${index}].type is unsupported`);
        }
      }
    }
  }
  for (const [name, deps] of dependencies) {
    for (const dependency of deps) {
      if (!serviceNames.includes(dependency)) throw new TypeError(`services.${name} depends on unknown service ${dependency}`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(name: string): void {
    if (visiting.has(name)) throw new TypeError("service dependencies must not contain cycles");
    if (visited.has(name)) return;
    visiting.add(name);
    for (const dependency of dependencies.get(name) ?? []) visit(dependency);
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of serviceNames) visit(name);

  for (const key of ["remove_chronjobs", "remove_services", "volumes", "remove_volumes"] as const) {
    const values = root[key];
    if (values !== undefined && values !== null) uniqueStrings(values, key);
  }
  const createdVolumes = new Set((root.volumes ?? []) as string[]);
  for (const volume of (root.remove_volumes ?? []) as string[]) {
    if (createdVolumes.has(volume)) throw new TypeError(`volume ${volume} cannot be created and removed in one run`);
  }
  const removedServices = new Set((root.remove_services ?? []) as string[]);
  for (const name of serviceNames) {
    if (removedServices.has(name)) throw new TypeError(`service ${name} cannot be created and removed in one run`);
  }
  if (root.chronjobs !== undefined && root.chronjobs !== null) {
    const chronjobs = record(root.chronjobs, "chronjobs");
    for (const [name, raw] of Object.entries(chronjobs)) {
      const job = record(raw, `chronjobs.${name}`);
      checkKeys(job, ["timer", "services"], `chronjobs.${name}`);
      string(job.timer, `chronjobs.${name}.timer`);
      if (job.timer.split(/\s+/u).length !== 5) throw new TypeError(`chronjobs.${name}.timer must contain five cron fields`);
      const tasks = record(job.services, `chronjobs.${name}.services`);
      if (Object.keys(tasks).length === 0) throw new TypeError(`chronjobs.${name}.services must not be empty`);
      for (const [serviceName, scheduled] of Object.entries(tasks)) {
        validateScheduledService(scheduled, `chronjobs.${name}.services.${serviceName}`);
        validateCommand(record(scheduled, "scheduled service").command, `chronjobs.${name}.services.${serviceName}.command`);
      }
    }
  }
  if (root.connections !== undefined && root.connections !== null) {
    const plan = record(root.connections, "connections");
    checkKeys(plan, ["create", "remove"], "connections");
    for (const key of ["create", "remove"] as const) {
      const entries = plan[key];
      if (entries === undefined || entries === null) continue;
      if (!Array.isArray(entries)) throw new TypeError(`connections.${key} must be an array`);
      for (const [index, raw] of entries.entries()) {
        const entry = record(raw, `connections.${key}[${index}]`);
        if (key === "remove") {
          validateReferenceId(entry.id, `connections.remove[${index}].id`);
          const resource = record(entry.resource, `connections.remove[${index}].resource`);
          validateReferenceId(resource.id, `connections.remove[${index}].resource.id`);
        } else {
          string(entry.manager, `connections.create[${index}].manager`);
          if (entry.name !== undefined) string(entry.name, `connections.create[${index}].name`);
          const resource = record(entry.resource, `connections.create[${index}].resource`);
          validateReferenceId(resource.id, `connections.create[${index}].resource.id`);
          validateJson(entry.metadata, `connections.create[${index}].metadata`);
        }
      }
    }
  }
}
