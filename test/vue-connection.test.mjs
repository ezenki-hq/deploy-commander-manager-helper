import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const name of ["window", "document", "HTMLElement", "SVGElement", "Element", "Node", "MutationObserver", "getComputedStyle"]) globalThis[name] = name === "window" || name === "document" ? dom.window[name] : dom.window[name];
const Vue = await import("vue");
const { mount, flushPromises } = await import("@vue/test-utils");
const { ConnectionSection, CreateConnectionSection, ManagerInvocationSection } = await import("../packages/vue/dist/index.js");
afterEach(() => globalThis.document.body.replaceChildren());
const stamp = "2026-01-01T00:00:00.000Z";
const resource = { id: "r1", manager: "owner", name: "Primary DB", type: "database", external: true, created_at: stamp, updated_at: stamp };
const existing = { id: "c1", resource: "r1", manager: "consumer", external: false, created_at: stamp, updated_at: stamp };
function wireFor(closeResult, rows = []) {
  const calls = [];
  return { calls, async sendRPC(call) { calls.push(call); if (call.request === "getManager") return { ok: true, result: "consumer" }; if (call.request === "getResources") return { ok: true, result: { items: [resource], offset: call.payload.offset, limit: call.payload.limit, total: 1 } }; if (call.request === "getConnections") return { ok: true, result: { items: rows, offset: call.payload.offset, limit: call.payload.limit, total: rows.length } }; if (call.request === "getCallingManager") return { ok: true, result: "caller" }; if (call.request === "getMetadata") return { ok: true, result: { purpose: "test" } }; throw Error(call.request); }, async startInterface(call) { calls.push({ request: "startInterface", payload: call }); return { id: "child", close: Promise.resolve(closeResult) }; }, close(response) { calls.push({ request: "close", response }); }, end() {} };
}
test("Vue connection section opens owner interface and updates selection", async () => {
  const wire = wireFor({ manager: "owner", ok: true, result: { kind: "created", resourceId: "r1", connectionId: "c2" } }, [existing, { ...existing, id: "c2" }]);
  const selected = [];
  const wrapper = mount(ConnectionSection, { props: { wire, resource: { resourceId: "r1" }, selection: { initialData: { connectionIds: [] } }, onSelectionChange: (ids) => selected.push([...ids]) } });
  await flushPromises();
  await wrapper.findAll("button").find((button) => button.text() === "Create Connection").trigger("click");
  await flushPromises();
  assert.deepEqual(selected.at(-1), ["c2"]);
  assert.ok(wire.calls.some((call) => call.request === "startInterface" && call.payload.manager === "owner" && call.payload.metadata.resourceId === "r1"));
  wrapper.unmount();
});
test("Vue invocation called slot completes through wire.close once", async () => {
  const wire = wireFor();
  const wrapper = mount(ManagerInvocationSection, { props: { wire, definition: { parseMetadata: (value) => value } }, slots: { called: ({ context }) => Vue.h("button", { onClick: () => { context.complete({ ok: true }); context.fail({ message: "late" }); } }, context.callingManagerId) } });
  await flushPromises();
  await wrapper.get("button").trigger("click");
  assert.equal(wire.calls.filter((call) => call.request === "close").length, 1);
  wrapper.unmount();
});
test("Vue invocation section renders standalone without a metadata request", async () => {
  const calls = [];
  const wire = { calls, async sendRPC(call) { calls.push(call); if (call.request === "getManager") return { ok: true, result: "provider" }; if (call.request === "getCallingManager") return { ok: true, result: null }; throw Error(call.request); }, close() {}, end() {} };
  const wrapper = mount(ManagerInvocationSection, { props: { wire }, slots: { standalone: () => Vue.h("p", "Standalone manager") } });
  await flushPromises();
  assert.equal(wrapper.text(), "Standalone manager");
  assert.equal(calls.some((call) => call.request === "getMetadata"), false);
  wrapper.unmount();
});
test("Vue invocation wrapper hosts the provider and the provider closes exactly once", async () => {
  const calls = [];
  const owned = { resource, config: { id: "r1", manager: "owner", agent: "agent1", name: "Primary DB", resource_type: "database", external: true, created_at: stamp, updated_at: stamp, metadata: {} } };
  const created = { id: "c3", resource: "r1", manager: "consumer", external: false, created_at: stamp, updated_at: stamp };
  const wire = { calls, async sendRPC(call) { calls.push(call); if (call.request === "getManager") return { ok: true, result: "owner" }; if (call.request === "getCallingManager") return { ok: true, result: "consumer" }; if (call.request === "getMetadata") return { ok: true, result: { purpose: "createConnection", resourceId: "r1" } }; if (call.request === "getResource") return { ok: true, result: owned }; if (call.request === "getConnections") return { ok: true, result: { items: [], offset: call.payload.offset, limit: call.payload.limit, total: 0 } }; if (call.request === "createConnection") return { ok: true, result: { connection: created, config: {} } }; throw Error(call.request); }, close(response) { calls.push({ request: "close", response }); }, end() {} };
  const definition = { initialSettings: () => ({ label: "test" }), onCreateConnection: (settings) => ({ metadata: settings }) };
  const wrapper = mount(ManagerInvocationSection, { props: { wire, definition: { parseMetadata: (value) => value } }, slots: { called: () => Vue.h(CreateConnectionSection, { wire, definition }, { default: () => Vue.h("p", "Provider settings") }) } });
  await flushPromises();
  await wrapper.get("button").trigger("click");
  await flushPromises();
  assert.equal(calls.filter((call) => call.request === "close").length, 1);
  assert.equal(calls.find((call) => call.request === "close").response.result.connectionId, "c3");
  wrapper.unmount();
});
