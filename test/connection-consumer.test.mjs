import assert from "node:assert/strict";
import test from "node:test";
import { createConnectionConsumerActions } from "../packages/core/dist/index.js";

function wireFor(respond, close) {
  const calls = [];
  return { calls, async sendRPC(call) { calls.push(call); return respond(call); }, async startInterface(call) { calls.push({ request: "startInterface", payload: call }); return { id: "child", close: Promise.resolve(close) }; }, close() {}, end() {} };
}
const resource = { id: "r1", manager: "owner", name: "One", type: "database", external: true, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" };
const page = (items, offset = 0, total = items.length) => ({ items, offset, limit: 50, total });
test("consumer opens the resource owner, validates child result, and refreshes authorized connections", async () => {
  const calls = [];
  const wire = wireFor((call) => {
    calls.push(call);
    if (call.request === "getManager") return { ok: true, result: "consumer" };
    if (call.request === "getResources") return { ok: true, result: page([resource], call.payload.offset) };
    if (call.request === "getConnections") return { ok: true, result: page([{ id: "c1", resource: "r1", manager: "consumer", external: false, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }], call.payload.offset) };
    throw Error(`unexpected ${call.request}`);
  }, { manager: "owner", ok: true, result: { kind: "created", resourceId: "r1", connectionId: "c1" } });
  const actions = createConnectionConsumerActions(wire);
  const result = await actions.requestConnection("r1");
  assert.equal(result.kind, "created");
  assert.equal(result.connection.id, "c1");
  assert.ok(wire.calls.some((call) => call.request === "startInterface" && call.payload.manager === "owner" && call.payload.metadata.resourceId === "r1"));
  assert.equal(wire.calls.some((call) => call.request === "getResource" || call.request === "createConnection"), false);
  assert.ok(calls.filter((call) => call.request === "getConnections").every((call) => call.payload.manager === "consumer" && call.payload.resource === "r1"));
});

test("consumer rejects a child result that cannot be found in authorized rows", async () => {
  const wire = wireFor((call) => call.request === "getManager" ? { ok: true, result: "consumer" }
    : call.request === "getResources" ? { ok: true, result: page([resource], call.payload.offset) }
      : { ok: true, result: page([], call.payload.offset, 0) },
  { manager: "owner", ok: true, result: { kind: "created", resourceId: "r1", connectionId: "hidden" } });
  await assert.rejects(createConnectionConsumerActions(wire).requestConnection("r1"), /authorized connection/);
});

test("consumer applies filters across every page and rejects self-owned or missing resources", async () => {
  const calls = [];
  const items = Array.from({ length: 51 }, (_, index) => ({ ...resource, id: `r${index}` }));
  const wire = wireFor((call) => {
    calls.push(call);
    if (call.request === "getResources") return { ok: true, result: page(items.slice(call.payload.offset, call.payload.offset + 50), call.payload.offset, 51) };
    if (call.request === "getManager") return { ok: true, result: "consumer" };
    throw Error(call.request);
  }, { manager: "owner", ok: true, result: { kind: "cancelled" } });
  const actions = createConnectionConsumerActions(wire);
  const result = await actions.getResources({ filters: { type: "database", external: true } });
  assert.equal(result.length, 51);
  const pages = calls.filter((call) => call.request === "getResources");
  assert.deepEqual(pages.map((call) => call.payload.offset), [0, 50]);
  assert.equal(pages[0].payload.type, "database");

  const ownWire = wireFor((call) => call.request === "getManager" ? { ok: true, result: "consumer" }
    : call.request === "getResources" ? { ok: true, result: page([{ ...resource, manager: "consumer" }], call.payload.offset) }
      : { ok: true, result: page([], call.payload.offset, 0) }, { manager: "owner", ok: true, result: { kind: "cancelled" } });
  await assert.rejects(createConnectionConsumerActions(ownWire).requestConnection("r1"), /owned by this manager/);
  assert.equal(ownWire.calls.some((call) => call.request === "startInterface"), false);

  const missing = wireFor((call) => call.request === "getResources" ? { ok: true, result: page([], call.payload.offset, 0) } : { ok: true, result: "consumer" }, { manager: "owner", ok: true, result: { kind: "cancelled" } });
  await assert.rejects(createConnectionConsumerActions(missing).requestConnection("missing"), /not accessible/);
});

test("consumer rejects a child close from the wrong manager", async () => {
  const wire = wireFor((call) => call.request === "getManager" ? { ok: true, result: "consumer" }
    : call.request === "getResources" ? { ok: true, result: page([resource], call.payload.offset) }
      : { ok: true, result: page([{ id: "c1", resource: "r1", manager: "consumer", external: false, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }], call.payload.offset) },
  { manager: "attacker", ok: true, result: { kind: "created", resourceId: "r1", connectionId: "c1" } });
  await assert.rejects(createConnectionConsumerActions(wire).requestConnection("r1"), /different manager/);
});

test("consumer handles child cancellation, failure and a mismatched resource response", async () => {
  const parent = (close) => wireFor((call) => call.request === "getManager" ? { ok: true, result: "consumer" }
    : call.request === "getResources" ? { ok: true, result: page([resource], call.payload.offset) }
      : { ok: true, result: page([{ id: "c1", resource: "r1", manager: "consumer", external: false, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }], call.payload.offset) }, close);
  const cancelled = parent({ manager: "owner", ok: true, result: { kind: "cancelled" } });
  assert.deepEqual(await createConnectionConsumerActions(cancelled).requestConnection("r1"), { kind: "cancelled" });
  const failed = parent({ manager: "owner", ok: false, error: { message: "provider failed" } });
  await assert.rejects(createConnectionConsumerActions(failed).requestConnection("r1"), /provider failed/);
  const mismatched = parent({ manager: "owner", ok: true, result: { kind: "created", resourceId: "different", connectionId: "c1" } });
  await assert.rejects(createConnectionConsumerActions(mismatched).requestConnection("r1"), /different resource/);
});
