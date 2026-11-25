import assert from "node:assert/strict";
import test, { after, afterEach, before } from "node:test";
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const name of ["window", "document", "Node", "Element", "HTMLElement", "Event", "MouseEvent", "MutationObserver", "getComputedStyle"]) globalThis[name] = dom.window[name];
let TestBed; let provideZonelessChangeDetection; let ConnectionHost; let ProviderInvocationHost; let fixture;
before(async () => {
  await import("@angular/compiler");
  const testing = await import("@angular/core/testing"); TestBed = testing.TestBed;
  ({ provideZonelessChangeDetection } = await import("@angular/core"));
  const platform = await import("@angular/platform-browser/testing"); testing.getTestBed().initTestEnvironment(platform.BrowserTestingModule, platform.platformBrowserTesting());
  ({ ConnectionHost, ProviderInvocationHost } = await import("../test-dist/tests/connection-host.component.js"));
});
afterEach(() => { fixture?.destroy(); fixture = undefined; TestBed.resetTestingModule(); globalThis.document.body.replaceChildren(); });
after(() => TestBed?.resetTestEnvironment());
async function createFixture(component) { await TestBed.configureTestingModule({ imports: [component], providers: [provideZonelessChangeDetection()] }).compileComponents(); fixture = TestBed.createComponent(component); return fixture; }
const stamp = "2026-01-01T00:00:00.000Z";
const resource = { id: "r1", manager: "owner", name: "Database", type: "database", external: true, created_at: stamp, updated_at: stamp };
test("Angular consumer section uses owner interface and returns the connection ID", async () => {
  const current = await createFixture(ConnectionHost); const calls = [];
  current.componentInstance.selected.set([]);
  current.componentInstance.wire.set({ async sendRPC(call) { calls.push(call); if (call.request === "getManager") return { ok: true, result: "consumer" }; if (call.request === "getResources") return { ok: true, result: { items: [resource], offset: call.payload.offset, limit: call.payload.limit, total: 1 } }; if (call.request === "getConnections") return { ok: true, result: { items: [{ id: "c2", resource: "r1", manager: "consumer", external: false, created_at: stamp, updated_at: stamp }], offset: call.payload.offset, limit: call.payload.limit, total: 1 } }; throw Error(call.request); }, async startInterface(call) { calls.push({ request: "startInterface", payload: call }); return { id: "child", close: Promise.resolve({ manager: "owner", ok: true, result: { kind: "created", resourceId: "r1", connectionId: "c2" } }) }; }, close() {}, end() {} });
  current.detectChanges();
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0)); current.detectChanges();
  const button = [...current.nativeElement.querySelectorAll("button")].find((item) => item.textContent.trim() === "Create Connection"); assert.ok(button, current.nativeElement.innerHTML + JSON.stringify(calls)); button.click();
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0)); current.detectChanges();
  assert.ok(calls.some((call) => call.request === "startInterface" && call.payload.manager === "owner"));
  assert.deepEqual(current.componentInstance.selected(), ["c2"]);
});
test("Angular invocation composition lets provider own the one terminal close", async () => {
  const current = await createFixture(ProviderInvocationHost); const calls = [];
  const own = { resource, config: { id: "r1", manager: "owner", agent: "agent1", name: "Database", resource_type: "database", external: true, created_at: stamp, updated_at: stamp, metadata: {} } };
  const created = { id: "c4", resource: "r1", manager: "consumer", external: false, created_at: stamp, updated_at: stamp };
  current.componentInstance.wire.set({ async sendRPC(call) { calls.push(call); if (call.request === "getManager") return { ok: true, result: "owner" }; if (call.request === "getCallingManager") return { ok: true, result: "consumer" }; if (call.request === "getMetadata") return { ok: true, result: { purpose: "createConnection", resourceId: "r1" } }; if (call.request === "getResource") return { ok: true, result: own }; if (call.request === "getConnections") return { ok: true, result: { items: [], offset: call.payload.offset, limit: call.payload.limit, total: 0 } }; if (call.request === "createConnection") return { ok: true, result: { connection: created, config: {} } }; throw Error(call.request); }, close(response) { calls.push({ request: "close", response }); }, end() {} });
  current.detectChanges(); for (let attempt = 0; attempt < 10; attempt++) { await new Promise((resolve) => globalThis.setTimeout(resolve, 0)); current.detectChanges(); }
  const button = [...current.nativeElement.querySelectorAll("button")].find((item) => item.textContent.trim() === "Create Connection"); assert.ok(button, current.nativeElement.innerHTML + JSON.stringify(calls)); button.click();
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0)); current.detectChanges();
  assert.equal(calls.filter((call) => call.request === "close").length, 1);
  assert.equal(calls.find((call) => call.request === "close").response.result.connectionId, "c4");
});
test("Angular invocation section renders standalone without reading metadata", async () => {
  const current = await createFixture(ProviderInvocationHost); const calls = [];
  current.componentInstance.wire.set({ async sendRPC(call) { calls.push(call); if (call.request === "getManager") return { ok: true, result: "owner" }; if (call.request === "getCallingManager") return { ok: true, result: null }; throw Error(call.request); }, close() {}, end() {} });
  current.detectChanges(); await new Promise((resolve) => globalThis.setTimeout(resolve, 0)); current.detectChanges();
  assert.match(current.nativeElement.textContent, /Standalone page/);
  assert.equal(calls.some((call) => call.request === "getMetadata"), false);
});
