import type { JSONValue } from "@ezenki/deploy-commander-installer-interface";
import type {
  ConnectionFilters,
  CreateConnectionConfig,
  LastRunFilters,
  MyConnectionFilters,
  ResourceFilters,
  StartRunConfig,
} from "./action-types.js";
import { validateRunnerMetadata } from "./runner-validation.js";

function requiredId(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "" || value !== value.trim()) {
    throw new TypeError(`${name} must be a nonblank string without surrounding whitespace`);
  }
}

function validatePagination(options: { limit?: number; offset?: number }): void {
  if (options.limit !== undefined && (!Number.isSafeInteger(options.limit) || options.limit <= 0)) {
    throw new RangeError("limit must be a positive safe integer");
  }
  if (options.offset !== undefined && (!Number.isSafeInteger(options.offset) || options.offset < 0)) {
    throw new RangeError("offset must be a nonnegative safe integer");
  }
}

function validateLabels(labels: unknown): void {
  if (labels === undefined) return;
  if (labels === null || typeof labels !== "object" || Array.isArray(labels)) {
    throw new TypeError("labels must be a string map");
  }
  for (const [key, value] of Object.entries(labels)) {
    if (key.trim() === "" || typeof value !== "string") throw new TypeError("labels must map nonblank keys to strings");
  }
}

function validateLabelQuery(options: {
  labels?: Record<string, string>;
  label_exists?: string[];
  label_match?: "all" | "any";
  include_labels?: boolean;
  label_keys?: string[];
}): void {
  validateLabels(options.labels);
  if (options.label_exists !== undefined &&
      (!Array.isArray(options.label_exists) || options.label_exists.some((key) => typeof key !== "string" || key.trim() === ""))) {
    throw new TypeError("label_exists must contain nonblank strings");
  }
  if (options.label_match !== undefined && options.label_match !== "all" && options.label_match !== "any") {
    throw new TypeError("label_match must be all or any");
  }
  if (options.include_labels !== undefined && typeof options.include_labels !== "boolean") {
    throw new TypeError("include_labels must be a boolean");
  }
  if (options.label_keys !== undefined &&
      (!Array.isArray(options.label_keys) || options.label_keys.some((key) => typeof key !== "string" || key.trim() === ""))) {
    throw new TypeError("label_keys must contain nonblank strings");
  }
}

function validateStringFilter(value: unknown, name: string): void {
  if (value !== undefined && (typeof value !== "string" || value.trim() === "")) {
    throw new TypeError(`${name} must be a nonblank string`);
  }
}

export function validateResourceFilters(filters: ResourceFilters): void {
  if (filters === null || typeof filters !== "object" || Array.isArray(filters)) throw new TypeError("filters must be an options object");
  validatePagination(filters);
  validateStringFilter(filters.type, "type");
  validateStringFilter(filters.manager, "manager");
  if (filters.external !== undefined && typeof filters.external !== "boolean") throw new TypeError("external must be a boolean");
  validateLabelQuery(filters);
}

export function validateConnectionFilters(filters: ConnectionFilters | MyConnectionFilters): void {
  if (filters === null || typeof filters !== "object" || Array.isArray(filters)) throw new TypeError("filters must be an options object");
  validatePagination(filters);
  validateStringFilter(filters.manager, "manager");
  validateStringFilter(filters.resource, "resource");
  validateLabelQuery(filters);
}

export function validateLastRunFilters(filters: LastRunFilters | undefined): void {
  if (filters === undefined) return;
  if (filters === null || typeof filters !== "object" || Array.isArray(filters)) throw new TypeError("filters must be an options object");
  for (const key of ["action", "user_id", "target_kind", "target_id"] as const) {
    validateStringFilter(filters[key], key);
  }
  if (filters.statuses !== undefined && (!Array.isArray(filters.statuses) || filters.statuses.some((status) => typeof status !== "string"))) {
    throw new TypeError("statuses must be a string array");
  }
  if (filters.not_statuses !== undefined && (!Array.isArray(filters.not_statuses) || filters.not_statuses.some((status) => typeof status !== "string"))) {
    throw new TypeError("not_statuses must be a string array");
  }
  validateLabelQuery(filters);
}

function assertJsonValue(value: unknown, name: string, stack = new Set<object>()): asserts value is JSONValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must contain finite JSON numbers`);
    return;
  }
  if (typeof value !== "object") throw new TypeError(`${name} must contain only JSON values`);
  if (stack.has(value)) throw new TypeError(`${name} must not contain circular references`);
  stack.add(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) assertJsonValue(child, name, stack);
  stack.delete(value);
}

export function validateCreateConnectionConfig(config: CreateConnectionConfig): void {
  if (config === null || typeof config !== "object" || Array.isArray(config)) throw new TypeError("config must be an object");
  requiredId(config.managerId, "managerId");
  requiredId(config.resourceId, "resourceId");
  if (typeof config.external !== "boolean") throw new TypeError("external must be a boolean");
  assertJsonValue(config.metadata, "metadata");
  validateLabels(config.labels);
}

export function validateStartRunConfig(config: StartRunConfig): void {
  if (config === null || typeof config !== "object" || Array.isArray(config)) throw new TypeError("config must be an object");
  const acceptedFields = new Set([
    "action", "sub_queue", "metadata", "note", "platform_data", "config", "target", "labels", "secrets",
  ]);
  for (const key of Object.keys(config)) {
    if (!acceptedFields.has(key)) throw new TypeError(`config has unsupported field ${key}`);
  }
  validateStringFilter(config.action, "action");
  if (config.sub_queue !== undefined) {
    const bytes = encodeURIComponent(config.sub_queue).replace(/%[A-F\d]{2}|./giu, "x").length;
    if (config.sub_queue.length === 0 || bytes > 128 || config.sub_queue.trim() !== config.sub_queue ||
        /[\u0000-\u001f\u007f]/u.test(config.sub_queue)) { // eslint-disable-line no-control-regex
      throw new TypeError("sub_queue must be 1 to 128 UTF-8 bytes without surrounding whitespace or control characters");
    }
  }
  if (config.action === "teardown" && config.sub_queue !== undefined) {
    throw new TypeError("teardown must use the main queue");
  }
  if (config.note !== undefined && typeof config.note !== "string") throw new TypeError("note must be a string");
  if (config.target !== undefined) {
    requiredId(config.target.kind, "target.kind");
    requiredId(config.target.id, "target.id");
  }
  validateLabels(config.labels);
  if (config.secrets !== undefined) {
    if (config.secrets === null || typeof config.secrets !== "object" || Array.isArray(config.secrets) ||
        Object.values(config.secrets).some((value) => typeof value !== "string")) {
      throw new TypeError("secrets must be a string map");
    }
  }
  if (config.metadata !== undefined && config.metadata !== null) validateRunnerMetadata(config.metadata);
  if (config.config !== undefined) assertJsonValue(config.config, "config");
  if (config.platform_data !== undefined) assertJsonValue(config.platform_data, "platform_data");
}

export { requiredId, validatePagination };
