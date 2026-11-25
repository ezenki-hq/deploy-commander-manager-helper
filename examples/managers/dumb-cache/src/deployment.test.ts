import { describe, expect, it } from "vitest";
import { buildCacheInstall, buildCacheTeardown } from "./deployment.js";

describe("Dumb Cache runner input", () => {
  it("publishes a stable resource on its private Docker service", () => {
    const input = buildCacheInstall();
    expect(input.action).toBe("setup");
    expect(input.metadata?.services?.["dumb-cache"]?.image).toBe("ezenki/dumb-cache:latest");
    expect(input.metadata?.services?.["dumb-cache"]?.aliases).toEqual(["dumb-cache"]);
    expect(input.metadata?.services?.["dumb-cache"]?.resources).toEqual([{ resource_type: "dumb-cache", name: "dumb-cache", metadata: { url: "http://dumb-cache:8080" } }]);
  });
  it("uses the runner teardown action", () => expect(buildCacheTeardown).toEqual({ action: "teardown" }));
});
