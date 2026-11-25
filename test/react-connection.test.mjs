import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.HTMLElement = dom.window.HTMLElement; globalThis.Node = dom.window.Node; globalThis.MutationObserver = dom.window.MutationObserver; globalThis.getComputedStyle = dom.window.getComputedStyle; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
const React = await import("react");
const { cleanup, fireEvent, render, screen, waitFor } = await import("@testing-library/react");
const { ConnectionSection, CreateConnectionSection, ManagerInvocationSection } = await import("../packages/react/dist/index.js");
afterEach(() => cleanup());

const stamp = "2026-01-01T00:00:00.000Z";
const resource = { id: "r1", manager: "owner", name: "Primary DB", type: "database", external: true, created_at: stamp, updated_at: stamp };
const existing = { id: "c1", resource: "r1", manager: "consumer", external: false, created_at: stamp, updated_at: stamp };
function wireFor(closeResult, rows = []) {
  const calls = [];
  return { calls, async sendRPC(call) { calls.push(call); if (call.request === "getManager") return { ok: true, result: "consumer" }; if (call.request === "getResources") return { ok: true, result: { items: [resource], offset: call.payload.offset, limit: call.payload.limit, total: 1 } }; if (call.request === "getConnections") return { ok: true, result: { items: rows, offset: call.payload.offset, limit: call.payload.limit, total: rows.length } }; if (call.request === "getCallingManager") return { ok: true, result: "calling-manager" }; if (call.request === "getMetadata") return { ok: true, result: { purpose: "test" } }; throw Error(call.request); }, async startInterface(call) { calls.push({ request: "startInterface", payload: call }); return { id: "child", close: Promise.resolve(closeResult) }; }, close(response) { calls.push({ request: "close", response }); }, end() {} };
}

test("React connection section opens the owner interface and emits the created connection ID", async () => {
  const wire = wireFor({ manager: "owner", ok: true, result: { kind: "created", resourceId: "r1", connectionId: "c2" } }, [existing, { ...existing, id: "c2" }]);
  const selected = [];
  render(React.createElement(ConnectionSection, { wire, resource: { resourceId: "r1" }, initialData: { connectionIds: [] }, onSelectionChange: (ids) => selected.push([...ids]) }));
  await waitFor(() => assert.equal(screen.getByRole("button", { name: "Create Connection" }).disabled, false));
  fireEvent.click(screen.getByRole("button", { name: "Create Connection" }));
  await waitFor(() => assert.deepEqual(selected.at(-1), ["c2"]));
  assert.ok(wire.calls.some((call) => call.request === "startInterface" && call.payload.manager === "owner" && call.payload.metadata.resourceId === "r1"));
  assert.equal(wire.calls.some((call) => call.request === "getResource" || call.request === "createConnection"), false);
});

test("React connection section selects existing connections and enforces the default one-connection cap", async () => {
  const wire = wireFor({ manager: "owner", ok: true, result: { kind: "cancelled" } }, [existing]);
  const selected = [];
  render(React.createElement(ConnectionSection, { wire, resource: { resourceId: "r1" }, initialData: { connectionIds: [] }, onSelectionChange: (ids) => selected.push([...ids]) }));
  await waitFor(() => assert.ok(screen.getByRole("button", { name: "Select c1" })));
  fireEvent.click(screen.getByRole("button", { name: "Select c1" }));
  await waitFor(() => assert.deepEqual(selected.at(-1), ["c1"]));
  assert.equal(screen.queryByRole("button", { name: "Create Connection" }), null);
  fireEvent.change(screen.getByRole("textbox", { name: "Search resources" }), { target: { value: "no match" } });
  assert.equal(screen.getByRole("combobox", { name: "Resource" }).options.length, 0);
});
test("React connection section permits multiple connections to one resource when configured", async () => {
  const wire = wireFor({ manager: "owner", ok: true, result: { kind: "cancelled" } }, [existing, { ...existing, id: "c2" }]);
  const selected = [];
  render(React.createElement(ConnectionSection, { wire, resource: { resourceId: "r1" }, maxConnections: 2, initialData: { connectionIds: [] }, onSelectionChange: (ids) => selected.push([...ids]) }));
  await waitFor(() => assert.ok(screen.getByRole("button", { name: "Select c1" })));
  fireEvent.click(screen.getByRole("button", { name: "Select c1" }));
  fireEvent.click(screen.getByRole("button", { name: "Select c2" }));
  await waitFor(() => assert.deepEqual(selected.at(-1), ["c1", "c2"]));
});
test("React connection section renders deletion only when a handler is supplied", async () => {
  const wire = wireFor({ manager: "owner", ok: true, result: { kind: "cancelled" } }, [existing]);
  const deleted = [];
  render(React.createElement(ConnectionSection, { wire, resource: { resourceId: "r1" }, initialData: { connectionIds: [] }, onDeleteConnection: (row) => deleted.push(row.id) }));
  await waitFor(() => assert.ok(screen.getByRole("button", { name: "Select c1" })));
  fireEvent.click(screen.getByRole("button", { name: "Select c1" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => assert.deepEqual(deleted, ["c1"]));
});

test("React invocation section renders called content and completes once through its own callback", async () => {
  const wire = wireFor();
  render(React.createElement(ManagerInvocationSection, { wire, definition: { parseMetadata: (value) => value }, called: (context) => React.createElement("button", { onClick: () => { context.complete({ accepted: true }); context.fail({ message: "late" }); } }, context.callingManagerId) }));
  fireEvent.click(await screen.findByRole("button", { name: "calling-manager" }));
  assert.equal(wire.calls.filter((call) => call.request === "close").length, 1);
  assert.deepEqual(wire.calls.find((call) => call.request === "close").response, { manager: "consumer", ok: true, result: { accepted: true } });
});
test("React invocation section renders standalone without reading metadata", async () => {
  const calls = [];
  const wire = { calls, async sendRPC(call) { calls.push(call); if (call.request === "getManager") return { ok: true, result: "provider" }; if (call.request === "getCallingManager") return { ok: true, result: null }; throw Error(call.request); }, close() {}, end() {} };
  render(React.createElement(ManagerInvocationSection, { wire, definition: { parseMetadata() { throw Error("should not parse"); } }, standalone: () => React.createElement("p", null, "Standalone manager") }));
  await screen.findByText("Standalone manager");
  assert.equal(calls.some((call) => call.request === "getMetadata"), false);
});
test("React invocation wrapper can host the resource owner and the provider closes exactly once", async () => {
  const calls = [];
  const owned = { resource, config: { id: "r1", manager: "owner", agent: "agent1", name: "Primary DB", resource_type: "database", external: true, created_at: stamp, updated_at: stamp, metadata: {} } };
  const created = { id: "c3", resource: "r1", manager: "consumer", external: false, created_at: stamp, updated_at: stamp };
  const wire = {
    calls,
    async sendRPC(call) {
      calls.push(call);
      if (call.request === "getManager") return { ok: true, result: "owner" };
      if (call.request === "getCallingManager") return { ok: true, result: "consumer" };
      if (call.request === "getMetadata") return { ok: true, result: { purpose: "createConnection", resourceId: "r1" } };
      if (call.request === "getResource") return { ok: true, result: owned };
      if (call.request === "getConnections") return { ok: true, result: { items: [], offset: call.payload.offset, limit: call.payload.limit, total: 0 } };
      if (call.request === "createConnection") return { ok: true, result: { connection: created, config: {} } };
      throw Error(call.request);
    }, close(response) { calls.push({ request: "close", response }); }, end() {},
  };
  render(React.createElement(ManagerInvocationSection, {
    wire,
    definition: { parseMetadata: (value) => value },
    called: () => React.createElement(CreateConnectionSection, { wire, initialSettings: () => ({ label: "test" }), onCreateConnection: (settings) => ({ metadata: settings }), children: () => React.createElement("p", null, "Provider settings") }),
  }));
  await waitFor(() => assert.ok(screen.getByText("Provider settings")));
  await waitFor(() => assert.equal(screen.getByRole("button", { name: "Create Connection" }).disabled, false));
  fireEvent.click(screen.getByRole("button", { name: "Create Connection" }));
  await waitFor(() => assert.equal(calls.filter((call) => call.request === "close").length, 1));
  assert.equal(calls.find((call) => call.request === "close").response.result.connectionId, "c3");
});
