import assert from "node:assert/strict";
import test from "node:test";
import { createConnectionSelectionController } from "../packages/core/dist/index.js";

const stamp = "2026-01-01T00:00:00.000Z";
const resource = (id) => ({ id, manager: "owner", name: id, type: "database", external: true, created_at: stamp, updated_at: stamp });
const connection = (id, resourceId = "r1") => ({ id, resource: resourceId, manager: "consumer", external: false, created_at: stamp, updated_at: stamp });
const tick = () => new Promise((resolve) => globalThis.setTimeout(resolve, 0));

test("selection controller defaults capacity to one and supports multiple IDs when explicitly allowed", async () => {
  const rows = [connection("c1"), connection("c2")];
  const actions = { async getResources() { return [resource("r1")]; }, async getConnections() { return rows; }, async getConnection(id) { return rows.find((row) => row.id === id); }, async requestConnection() { return { kind: "cancelled" }; }, async deleteConnection() {} };
  let state;
  const controller = createConnectionSelectionController(actions, (next) => { state = next; });
  controller.configure({ resource: { resourceId: "r1" }, initialData: { connectionIds: [] } });
  await tick();
  controller.select("c1"); controller.select("c2");
  assert.deepEqual(state.connectionIds, ["c1"]);
  controller.dispose();

  const multi = createConnectionSelectionController(actions, (next) => { state = next; });
  multi.configure({ resource: { resourceId: "r1" }, maxConnections: 2, initialData: { connectionIds: [] } });
  await tick();
  multi.select("c1"); multi.select("c2");
  assert.deepEqual(state.connectionIds, ["c1", "c2"]);
  assert.equal(state.canAdd, false);
  multi.dispose();
});

test("last resource query wins and dispose suppresses late state callbacks", async () => {
  const pending = [];
  const actions = { getResources(query) { return new Promise((resolve) => pending.push({ query, resolve })); }, async getConnections() { return []; }, async getConnection(id) { return connection(id); }, async requestConnection() { return { kind: "cancelled" }; }, async deleteConnection() {} };
  const states = [];
  const controller = createConnectionSelectionController(actions, (next) => states.push(next));
  controller.configure({ resource: { filters: { type: "first" } }, initialData: { connectionIds: [] } });
  controller.configure({ resource: { filters: { type: "second" } }, initialData: { connectionIds: [] } });
  pending[1].resolve([resource("r2")]); await tick();
  pending[0].resolve([resource("r1")]); await tick();
  assert.equal(states.at(-1).resources[0].id, "r2");
  const count = states.length;
  controller.dispose();
  await tick();
  assert.equal(states.length, count);
});

test("child completion respects controlled selection updates made while it is open", async () => {
  let finish;
  const rows = [connection("c1"), connection("c2")];
  const actions = { async getResources() { return [resource("r1")]; }, async getConnections() { return rows; }, async getConnection(id) { return rows.find((row) => row.id === id); }, requestConnection() { return new Promise((resolve) => { finish = resolve; }); }, async deleteConnection() {} };
  const changes = [];
  let state;
  const controller = createConnectionSelectionController(actions, (next) => { state = next; });
  controller.configure({ resource: { resourceId: "r1" }, maxConnections: 1, data: { connectionIds: [] }, onDataChange: (value) => changes.push(value), onSelectionChange: (ids) => changes.push(ids) });
  await tick();
  const operation = controller.create();
  controller.configure({ resource: { resourceId: "r1" }, maxConnections: 1, data: { connectionIds: ["c1"] }, onDataChange: (value) => changes.push(value), onSelectionChange: (ids) => changes.push(ids) });
  finish({ kind: "created", connection: connection("c2"), connections: rows });
  await operation;
  assert.deepEqual(state.connectionIds, ["c1"]);
  assert.match(state.notice, /capacity/);
  controller.dispose();
});
