import assert from "node:assert/strict";
import test from "node:test";
import { createCoreActions } from "../packages/core/dist/index.js";

test("startRun validates queue UTF-8 byte length and teardown queue restriction", async () => {
  const calls = [];
  const wire = {
    sendRPC: async (call) => {
      calls.push(call);
      return { ok: true, result: { id: "run", queued_at: "now", status: 0 } };
    },
  };
  const actions = createCoreActions(wire);
  await actions.startRun({ action: "deploy", sub_queue: "é".repeat(64) });
  await assert.rejects(actions.startRun({ action: "deploy", sub_queue: "é".repeat(65) }), /UTF-8 bytes/);
  await assert.rejects(actions.startRun({ action: "teardown", sub_queue: "cleanup" }), /main queue/);
  await assert.rejects(actions.startRun({ action: "deploy", runner: "untrusted" }), /unsupported field/);
  assert.equal(calls.length, 1);
});

test("startRun rejects bad port bindings and create-remove conflicts before RPC", async () => {
  const calls = [];
  const actions = createCoreActions({
    sendRPC: async (call) => {
      calls.push(call);
      return { ok: true, result: { id: "run", queued_at: "now", status: 0 } };
    },
  });
  await assert.rejects(actions.startRun({ action: "deploy", metadata: { services: {
    app: { image: "app", bindings: [{ container_port: 70000 }] },
  } } }), /container_port/);
  await assert.rejects(actions.startRun({ action: "deploy", metadata: {
    volumes: ["data"], remove_volumes: ["data"],
  } }), /created and removed/);
  assert.equal(calls.length, 0);
});

test("resource and connection removal entries require both UUIDs", async () => {
  const calls = [];
  const actions = createCoreActions({
    sendRPC: async (call) => {
      calls.push(call);
      return { ok: true, result: { id: "run", queued_at: "now", status: 0 } };
    },
  });
  await actions.startRun({ action: "deploy", metadata: { connections: { remove: [{
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    resource: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
  }] } } });
  await assert.rejects(actions.startRun({ action: "deploy", metadata: { connections: { remove: [{
    id: "missing-resource",
    resource: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
  }] } } }), /UUID/);
  assert.equal(calls.length, 1);
});

test("runner validation allows repeated command arguments and unnamed connection creates", async () => {
  const calls = [];
  const actions = createCoreActions({
    sendRPC: async (call) => {
      calls.push(call);
      return { ok: true, result: { id: "run", queued_at: "now", status: 0 } };
    },
  });
  await actions.startRun({ action: "deploy", metadata: {
    services: { app: { image: "app", command: ["echo", "echo"] } },
    connections: { create: [{
      manager: "receiver",
      resource: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
      metadata: {},
    }] },
  } });
  assert.equal(calls.length, 1);
});
