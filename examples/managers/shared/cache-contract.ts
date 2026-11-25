import type { ResourceSummary } from "@ezenki/deploy-commander-manager-sdk-core";

export const CACHE_RESOURCE_TYPE = "dumb-cache";
export const CACHE_RESOURCE_NAME = "dumb-cache";
export const CACHE_URL = "http://dumb-cache:8080";

export function isCacheResource(resource: ResourceSummary): boolean {
  return resource.type === CACHE_RESOURCE_TYPE && resource.name === CACHE_RESOURCE_NAME && !resource.external;
}

export function parseCacheMetadata(value: unknown): { url: string } {
  if (!value || typeof value !== "object" || (value as { url?: unknown }).url !== CACHE_URL) throw new TypeError("Invalid Dumb Cache interface metadata");
  return { url: CACHE_URL };
}
