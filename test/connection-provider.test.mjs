import assert from "node:assert/strict";
import test from "node:test";
import { openConnectionProviderSession } from "../packages/core/dist/index.js";

const stamp = "2026-01-01T00:00:00.000Z";
const own = { id: "r1", manager: "owner", name: "Database", type: "database", external: true, created_at: stamp, updated_at: stamp };
const connection = (id) => ({ id, resource: "r1", manager: "consumer", external: false, created_at: stamp, updated_at: stamp });
const owned = { resource: own, config: { id: "r1", manager: "owner", agent: "agent1", name: "Database", resource_type: "database", external: true, created_at: stamp, updated_at: stamp, metadata: {} } };

function providerWire({ connections = [], createResult = connection("c2"), caller = "consumer", resource = owned } = {}) {
  const calls = [];
  return {
    calls,
    async sendRPC(call) {
      calls.push(call);
      const payload = call.payload;
      switch (call.request) {
        case "getManager": return { ok: true, result: "owner" };
        case "getCallingManager": return { ok: true, result: caller };
        case "getMetadata": return { ok: true, result: { purpose: "createConnection", resourceId: "r1" } };
        case "getResource": return { ok: true, result: resource };
        case "getConnections": return { ok: true, result: { items: connections, offset: payload.offset, limit: payload.limit, total: connections.length } };
        case "createConnection": return { ok: true, result: { connection: createResult, config: {} } };
        default: throw new Error(`unexpected RPC ${call.request}`);
      }
    },
    close(response) { calls.push({ request: "close", response }); },
    end() {},
  };
}

test("provider uses the caller and owned resource context and creates via its own RPC", async () => {
  const wire = providerWire({ connections: [connection("c1")] });
  const session = await openConnectionProviderSession(wire);
  assert.equal(session.context.callingManagerId, "consumer");
  assert.equal(session.context.resource.resource.id, "r1");
  await session.create({ endpoint: "db" }, (settings) => ({ metadata: settings }));
  const create = wire.calls.find((call) => call.request === "createConnection");
  assert.equal(create.payload.connect_manager_id, "consumer");
  assert.equal(create.payload.resource_id, "r1");
  assert.equal(create.payload.config.metadata.endpoint, "db");
  assert.deepEqual(wire.calls.at(-1), { request: "close", response: { manager: "owner", ok: true, result: { kind: "created", resourceId: "r1", connectionId: "c2" } } });
  assert.equal(wire.calls.filter((call) => call.request === "close").length, 1);
});

test("provider rejects unowned resources and caller context before creating", async () => {
  await assert.rejects(openConnectionProviderSession(providerWire({ caller: null })), /calling manager/i);
  const foreign = { ...owned, resource: { ...own, manager: "other" } };
  await assert.rejects(openConnectionProviderSession(providerWire({ resource: foreign })), /owned by this manager/i);
});

test("provider only deletes connections in the caller/resource scope", async () => {
  const wire = providerWire({ connections: [connection("c1")] });
  const session = await openConnectionProviderSession(wire);
  let deleted;
  await assert.rejects(session.delete("unknown", () => { deleted = true; }), /not authorized/i);
  assert.equal(deleted, undefined);
  await session.delete("c1", async (row) => { deleted = row.id; });
  assert.equal(deleted, "c1");
});

test("provider cancellation closes once with an explicit cancellation result", async () => {
  const wire = providerWire();
  const session = await openConnectionProviderSession(wire);
  session.cancel(); session.cancel();
  assert.equal(wire.calls.filter((call) => call.request === "close").length, 1);
  assert.deepEqual(wire.calls.at(-1).response, { manager: "owner", ok: true, result: { kind: "cancelled" } });
});

test("provider locks concurrent create and ignores cancellation during the mutation", async () => {
  const wire = providerWire();
  const session = await openConnectionProviderSession(wire);
  let release;
  const create = session.create({}, () => new Promise((resolve) => { release = resolve; }));
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
  await assert.rejects(session.create({}, () => ({ metadata: {} })), /already handling/);
  session.cancel();
  assert.equal(wire.calls.some((call) => call.request === "close"), false);
  release({ metadata: { ready: true } });
  await create;
  assert.equal(wire.calls.filter((call) => call.request === "close").length, 1);
  assert.equal(wire.calls.at(-1).response.result.connectionId, "c2");
});

test("provider treats mismatched create responses as terminal failures", async () => {
  const wire = providerWire({ createResult: { ...connection("foreign"), manager: "another-manager" } });
  const session = await openConnectionProviderSession(wire);
  await session.create({}, () => ({ metadata: {} }));
  assert.equal(wire.calls.filter((call) => call.request === "close").length, 1);
  assert.equal(wire.calls.at(-1).response.ok, false);
  await assert.rejects(session.create({}, () => ({ metadata: {} })), /already handling/);
});
