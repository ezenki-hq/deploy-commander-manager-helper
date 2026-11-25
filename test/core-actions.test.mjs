import assert from "node:assert/strict";
import test from "node:test";
import { createCoreActions } from "../packages/core/dist/index.js";

function scriptedWire(respond) {
  const calls = [];
  return {
    calls,
    sendRPC: async (call) => {
      calls.push(call);
      return respond(call);
    },
  };
}

function page(items, offset, total = items.length) {
  return { ok: true, result: { items, limit: 50, offset, total } };
}

const resource = (id, manager = "other") => ({
  id,
  name: id,
  manager,
  type: "database",
  external: false,
  created_at: "now",
  updated_at: "now",
});

test("resource summary search paginates and matches exact IDs", async () => {
  const wire = scriptedWire((call) => {
    if (call.request === "getResources") {
      return call.payload.offset === 0
        ? page([resource("wanted-prefix")], 0, 2)
        : page([resource("wanted")], 1, 2);
    }
    throw new Error(`unexpected ${call.request}`);
  });
  const actions = createCoreActions(wire);
  assert.equal((await actions.getResource("wanted"))?.id, "wanted");
  assert.deepEqual(wire.calls.map(({ request, payload }) => [request, payload]), [
    ["getResources", { limit: 50, offset: 0 }],
    ["getResources", { limit: 50, offset: 1 }],
  ]);
});

test("resource summary search returns null after exhausting every page", async () => {
  const wire = scriptedWire((call) => call.request === "getResources"
    ? page(call.payload.offset === 0 ? [resource("one")] : [], call.payload.offset, 1)
    : { ok: true, result: {} });
  assert.equal(await createCoreActions(wire).getResource("absent"), null);
  assert.equal(wire.calls.length, 1);
});

test("resource summary lookup rejects malformed checked pagination", async () => {
  const wire = scriptedWire(() => page([], 3, 4));
  await assert.rejects(createCoreActions(wire).getResource("absent"), /offset/);
});

test("resource and connection page reads forward their typed filters", async () => {
  const wire = scriptedWire((call) => call.request === "getResources"
    ? page([], 4, 0)
    : { ok: true, result: { items: [], limit: 4, offset: 2, total: 0 } });
  const actions = createCoreActions(wire);
  await actions.getResources({ type: "database", external: false, limit: 4, offset: 4, include_labels: true });
  await actions.getConnections({ limit: 4, offset: 2, resource: "resource" });
  assert.deepEqual(wire.calls.map(({ request, payload }) => [request, payload]), [
    ["getResources", { type: "database", external: false, limit: 4, offset: 4, include_labels: true }],
    ["getConnections", { limit: 4, offset: 2, resource: "resource" }],
  ]);
});

test("owned resource details use the checked singular RPC", async () => {
  const wire = scriptedWire(() => ({
    ok: true,
    result: {
      resource: resource("mine", "current"),
      config: { id: "mine", manager: "current", resource_type: "database", name: "mine", agent: "agent",
        external: false, created_at: "now", updated_at: "now", metadata: {} },
    },
  }));
  const owned = await createCoreActions(wire).getMyResource("mine");
  assert.equal(owned.resource.manager, "current");
  assert.deepEqual(wire.calls.map(({ request }) => request), ["getResource"]);
});

test("owned resource retrieval rejects a response without its configuration", async () => {
  const wire = scriptedWire(() => ({
    ok: true,
    result: { resource: resource("mine", "current"), config: null },
  }));
  await assert.rejects(createCoreActions(wire).getMyResource("mine"), /configuration/);
});

test("resource connection lookup checks ownership before listing", async () => {
  const wire = scriptedWire((call) => {
    if (call.request === "getResource") return { ok: true, result: { resource: resource("mine", "current"), config: null } };
    if (call.request === "getConnections") return { ok: true, result: { items: [], limit: 50, offset: 0, total: 0 } };
    throw new Error(`unexpected ${call.request}`);
  });
  await createCoreActions(wire).getResourceConnections("mine");
  assert.deepEqual(wire.calls.map(({ request }) => request), ["getResource", "getConnections"]);
});

test("getMyConnections uses trusted manager identity", async () => {
  const wire = scriptedWire((call) => call.request === "getManager"
    ? { ok: true, result: "current" }
    : { ok: true, result: { items: [], limit: 10, offset: 0, total: 0 } });
  await createCoreActions(wire).getMyConnections({ limit: 10, resource: "resource-id" });
  assert.deepEqual(wire.calls.map(({ request, payload }) => [request, payload]), [
    ["getManager", {}],
    ["getConnections", { limit: 10, resource: "resource-id", manager: "current" }],
  ]);
});

test("manager-owned connections do not accept caller-selected identity at runtime", async () => {
  const wire = scriptedWire((call) => call.request === "getManager"
    ? { ok: true, result: "current" }
    : { ok: true, result: { items: [], limit: 50, offset: 0, total: 0 } });
  await createCoreActions(wire).getMyConnections({ manager: "other" });
  assert.deepEqual(wire.calls.map(({ request, payload }) => [request, payload]), [
    ["getManager", {}],
    ["getConnections", { manager: "current" }],
  ]);
});

test("connection detail uses the checked singular read", async () => {
  const detail = {
    connection: { id: "c", manager: "m", resource: "r", external: false, created_at: "now", updated_at: "now" },
    config: { id: "c", manager: "m", resource: "r", external: false, created_at: "now", updated_at: "now",
      metadata: {}, public_connection: { address: "db", port: 5432 } },
  };
  const wire = scriptedWire(() => ({ ok: true, result: detail }));
  assert.deepEqual(await createCoreActions(wire).getConnection("c"), detail);
  assert.deepEqual(wire.calls[0], { request: "getConnection", payload: { id: "c" } });
});

test("connection existence uses server-side manager and resource filters", async () => {
  const wire = scriptedWire(() => ({ ok: true, result: { items: [], limit: 1, offset: 0, total: 2 } }));
  assert.equal(await createCoreActions(wire).connectionExists("resource", "manager"), true);
  assert.deepEqual(wire.calls[0].payload, { resource: "resource", manager: "manager", limit: 1, offset: 0 });
});

test("connection creation permits duplicate pairs and deletion sends only its ID", async () => {
  const wire = scriptedWire((call) => ({ ok: true, result: call.request === "createConnection"
    ? { connection: { id: "connection" }, config: { id: "connection", metadata: {} } }
    : undefined }));
  const actions = createCoreActions(wire);
  const input = { metadata: {}, managerId: "manager", resourceId: "resource", external: false };
  await actions.createConnection(input);
  await actions.createConnection(input);
  await actions.deleteConnection("connection");
  assert.equal(wire.calls.filter(({ request }) => request === "createConnection").length, 2);
  assert.deepEqual(wire.calls[0].payload, {
    config: { metadata: {} }, connect_manager_id: "manager", external: false, resource_id: "resource",
    labels: undefined,
  });
  assert.deepEqual(wire.calls[2].payload, { id: "connection" });
});

test("connection mutation authorization errors propagate without fallback RPCs", async () => {
  const denied = { message: "forbidden", status: 403 };
  const wire = scriptedWire(() => ({ ok: false, error: denied }));
  const actions = createCoreActions(wire);
  await assert.rejects(actions.createConnection({
    metadata: {}, managerId: "manager", resourceId: "resource", external: false,
  }), (error) => error === denied);
  await assert.rejects(actions.deleteConnection("connection"), (error) => error === denied);
  assert.deepEqual(wire.calls.map(({ request }) => request), ["createConnection", "deleteConnection"]);
});

test("checked RPC failures propagate and resource ownership gates listing", async () => {
  const wire = scriptedWire((call) => ({ ok: false, error: { message: `denied ${call.request}`, status: 403 } }));
  const actions = createCoreActions(wire);
  await assert.rejects(actions.getResourceConnections("secret"), /denied getResource/);
  assert.deepEqual(wire.calls.map(({ request }) => request), ["getResource"]);
});

test("invalid identifiers and pagination are rejected before RPC", async () => {
  const wire = scriptedWire(() => { throw new Error("must not call"); });
  const actions = createCoreActions(wire);
  await assert.rejects(actions.getResource(" padded "), /id/);
  await assert.rejects(actions.getConnections({ limit: 0 }), /limit/);
  assert.equal(wire.calls.length, 0);
});

test("run reads use checked latest-run and return null when empty", async () => {
  const wire = scriptedWire(() => ({ ok: true, result: { items: [], limit: 1, offset: 0, total: 0 } }));
  assert.equal(await createCoreActions(wire).getLastRun({ action: "deploy" }), null);
  assert.deepEqual(wire.calls[0], { request: "getRuns", payload: { action: "deploy", sort: "-created_at", limit: 1, offset: 0 } });
});

test("startRun validates before RPC and fixes the documented runner contract", async () => {
  const wire = scriptedWire(() => ({ ok: true, result: { id: "run", queued_at: "now", status: 0 } }));
  const actions = createCoreActions(wire);
  await actions.startRun({ action: "deploy", metadata: { services: { app: { image: "app:latest" } } } });
  assert.equal(wire.calls[0].request, "start");
  assert.equal(wire.calls[0].payload.runner, "ezenki/deploy-commander-runner:latest");
  assert.equal(wire.calls[0].payload.platform, "docker");
  await actions.startRun({ action: "teardown" });
  assert.equal(wire.calls[1].payload.metadata, undefined);
  await assert.rejects(actions.startRun({ action: "deploy", sub_queue: "bad " }), /sub_queue/);
  await assert.rejects(actions.startRun({ action: "deploy", metadata: { services: { app: { image: "" } } } }), /image/);
  await assert.rejects(actions.startRun({ action: "deploy", metadata: { services: {
    app: { image: "app", depends_on: ["missing"] },
  } } }), /unknown service/);
  await assert.rejects(actions.startRun({ action: "deploy", metadata: { services: {
    app: { image: "app", depends_on: ["db"] },
    db: { image: "db", depends_on: ["app"] },
  } } }), /cycles/);
  await assert.rejects(actions.startRun({ action: "deploy", metadata: { services: {
    app: { image: "app", volumes: [{ name: "data", mount_path: "relative" }] },
  } } }), /absolute path/);
  await assert.rejects(actions.startRun({ action: "deploy", metadata: { unsupported: true } }), /unsupported field/);
  assert.equal(wire.calls.length, 2);
});

test("startRun preserves omitted, null and empty metadata values", async () => {
  const wire = scriptedWire(() => ({ ok: true, result: { id: "run", queued_at: "now", status: 0 } }));
  const actions = createCoreActions(wire);
  await actions.startRun({ action: "deploy", metadata: { volumes: [] } });
  await actions.startRun({ action: "deploy", metadata: null });
  assert.deepEqual(wire.calls[0].payload.metadata, { volumes: [] });
  assert.equal(wire.calls[1].payload.metadata, null);
});
