import type { StartRunConfig } from "@ezenki/deploy-commander-manager-sdk-core";
import { CACHE_RESOURCE_NAME, CACHE_RESOURCE_TYPE, CACHE_URL } from "../../shared/cache-contract.js";

export function buildCacheInstall(): StartRunConfig {
  return { action: "setup", metadata: { services: { "dumb-cache": { image: "ezenki/dumb-cache:latest", aliases: ["dumb-cache"], resources: [{ resource_type: CACHE_RESOURCE_TYPE, name: CACHE_RESOURCE_NAME, metadata: { url: CACHE_URL } }] } } } };
}
export const buildCacheTeardown: StartRunConfig = { action: "teardown" };
