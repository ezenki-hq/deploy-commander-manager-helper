import { describe, expect, it } from "vitest";
import { buildSetterInstall, buildSetterTeardown, installSetter } from "./deployment.js";

describe("Dumb Cache Setter runner input", () => {
  const connectionId = "22222222-2222-4222-8222-222222222222";
  const resourceId = "11111111-1111-4111-8111-111111111111";
  it("references both authorized IDs and configures the application origin", () => {
    const input = buildSetterInstall("connection-1", "resource-1", "http://dumb-cache:8080", 8081);
    expect(input.metadata?.services?.["dumb-cache-setter"]).toMatchObject({ image: "ezenki/dumb-cache-setter:latest", environment: { CACHE_URL: "http://dumb-cache:8080" }, bindings: [{ container_port: 8080, host_port: 8081, host_ip: "127.0.0.1" }], connections: [{ type: "Connection", data: { resource: "resource-1", connection: "connection-1" } }] });
  });
  it("rejects invalid identifiers and ports", () => {
    expect(() => buildSetterInstall("", "r", "http://dumb-cache:8080", 8081)).toThrow();
    expect(() => buildSetterInstall("c", "r", "http://dumb-cache:8080", 65536)).toThrow();
  });
  it("uses full runner teardown", () => expect(buildSetterTeardown).toEqual({ action: "teardown" }));

  it("preflights an authorized owner connection before starting the exact runner plan", async () => {
    const calls: { request: string; payload: Record<string, unknown> }[] = [];
    const wire = {
      async sendRPC(call: { request: string; payload: Record<string, unknown> }) {
        calls.push(call);
        if (call.request === "getManager") return { ok: true, result: "setter-manager" };
        if (call.request === "getConnection") return { ok: true, result: { connection: { id: connectionId, manager: "setter-manager", resource: resourceId, external: false, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }, config: { id: connectionId, manager: "setter-manager", resource: resourceId, external: false, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z", metadata: { url: "http://dumb-cache:8080" }, platform_connection: { network: "runner-resolved" } } } };
        if (call.request === "getResources") return { ok: true, result: { items: [{ id: resourceId, manager: "cache-manager", name: "dumb-cache", type: "dumb-cache", external: false, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }], limit: 50, offset: 0, total: 1 } };
        if (call.request === "start") return { ok: true, result: { id: "run-1", queued_at: "now", status: 0 } };
        throw new Error(`unexpected RPC ${call.request}`);
      },
      end() {},
    };
    await installSetter(wire as never, connectionId, 8081);
    expect(calls.map(call => call.request)).toEqual(["getManager", "getConnection", "getResources", "start"]);
    expect(calls[2]?.payload).toMatchObject({ limit: 50, offset: 0 });
    expect(calls[3]?.payload).toMatchObject({ action: "setup", runner: "ezenki/deploy-commander-runner:latest", platform: "docker", metadata: { services: { "dumb-cache-setter": { connections: [{ type: "Connection", data: { resource: resourceId, connection: connectionId } }] } } } });
  });

  it("rejects a connection belonging to another consuming manager", async () => {
    const wire = { async sendRPC(call: { request: string }) { if (call.request === "getManager") return { ok: true, result: "setter-manager" }; return { ok: true, result: { connection: { id: connectionId, manager: "other", resource: resourceId, external: false, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }, config: { id: connectionId, manager: "other", resource: resourceId, external: false, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z", metadata: {}, platform_connection: {} } } }; }, end() {} };
    await expect(installSetter(wire as never, connectionId, 8081)).rejects.toThrow("not owned by this manager");
  });
});
