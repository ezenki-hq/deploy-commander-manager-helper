import type { CreateConnectionInterfaceMetadata, CreateConnectionInterfaceResult } from "./types.js";
export function isCreateConnectionInterfaceMetadata(value: unknown): value is CreateConnectionInterfaceMetadata {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && (value as Record<string, unknown>).purpose === "createConnection"
    && typeof (value as Record<string, unknown>).resourceId === "string"
    && (value as Record<string, unknown>).resourceId !== ""
    && (value as Record<string, unknown>).resourceId === ((value as Record<string, unknown>).resourceId as string).trim();
}
export function parseCreateConnectionResult(value: unknown): CreateConnectionInterfaceResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError("Invalid connection interface result");
  const result = value as Record<string, unknown>;
  if (result.kind === "cancelled") return { kind: "cancelled" };
  if (result.kind !== "created" || typeof result.resourceId !== "string" || !result.resourceId.trim() || typeof result.connectionId !== "string" || !result.connectionId.trim()) {
    throw new TypeError("Invalid connection interface result");
  }
  return { kind: "created", resourceId: result.resourceId, connectionId: result.connectionId };
}
export function requiredConnectionId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !id.trim() || id !== id.trim()) throw new TypeError("Connection ID must be a nonblank string");
}
