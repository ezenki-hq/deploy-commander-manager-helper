import assert from "node:assert/strict";
import test, { after, afterEach, before } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.getComputedStyle = dom.window.getComputedStyle;

let TestBed;
let provideZonelessChangeDetection;
let SectionHostComponent;
let fixture;

before(async () => {
  await import("@angular/compiler");
  const testing = await import("@angular/core/testing");
  ({ provideZonelessChangeDetection } = await import("@angular/core"));
  const platform = await import("@angular/platform-browser/testing");
  TestBed = testing.TestBed;
  testing.getTestBed().initTestEnvironment(platform.BrowserTestingModule, platform.platformBrowserTesting());
  ({ SectionHostComponent } = await import("../test-dist/tests/section-host.component.js"));
});

afterEach(() => {
  fixture?.destroy();
  fixture = undefined;
  TestBed.resetTestingModule();
  globalThis.document.body.replaceChildren();
});

after(() => TestBed?.resetTestEnvironment());

async function createFixture() {
  await TestBed.configureTestingModule({
    imports: [SectionHostComponent],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();
  fixture = TestBed.createComponent(SectionHostComponent);
  fixture.detectChanges();
  return fixture;
}

test("Angular strict-template host compiles with the public body directive and shared exports", async () => {
  const current = await createFixture();
  assert.equal(current.nativeElement.querySelector("h2")?.textContent, "Profile");
  assert.equal(current.nativeElement.querySelector(".dcmsdk-group-two")?.textContent.trim(), "Grouped card");
});

test("controlled section edits update the parent and actions receive the displayed data", async () => {
  const current = await createFixture();
  current.componentInstance.setControlledData({ name: "controlled" });
  current.detectChanges();
  const input = current.nativeElement.querySelector("input");
  input.value = "after";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  current.detectChanges();
  assert.equal(current.componentInstance.sectionData().data.name, "after");
  const inspect = [...current.nativeElement.querySelectorAll("button")].find((button) => button.textContent.trim() === "Inspect");
  inspect.click();
  await Promise.resolve();
  assert.equal(current.componentInstance.lastActionData(), "after");
});

test("internal data accepts programmatic updates through the section instance", async () => {
  const current = await createFixture();
  const hostButton = [...current.nativeElement.querySelectorAll("button")].find((button) => button.textContent.trim() === "Host update");
  hostButton.click();
  current.detectChanges();
  assert.equal(current.nativeElement.querySelector("input").value, "host update");
});

test("read-only sections disable body fields and keep explicitly allowed actions", async () => {
  const current = await createFixture();
  current.componentInstance.readOnly.set(true);
  current.detectChanges();
  const input = current.nativeElement.querySelector("input");
  assert.equal(input.matches(":disabled"), true);
  assert.equal([...current.nativeElement.querySelectorAll("button")].some((button) => button.textContent.trim() === "Inspect"), false);
  const allowed = [...current.nativeElement.querySelectorAll("button")].find((button) => button.textContent.trim() === "Allowed");
  assert.ok(allowed);
  current.componentInstance.section.setData({ name: "host update" });
  current.detectChanges();
  assert.equal(input.value, "host update");
});

test("loader requests abort when their section is destroyed", async () => {
  const current = await createFixture();
  let signal;
  current.componentInstance.sectionData.set({
    loadData: (requestSignal) => {
      signal = requestSignal;
      return new Promise(() => {});
    },
  });
  current.detectChanges();
  await Promise.resolve();
  assert.ok(signal);
  current.destroy();
  fixture = undefined;
  assert.equal(signal.aborted, true);
});

test("action execution disables buttons and reports rejected operations", async () => {
  const current = await createFixture();
  let rejectRun;
  current.componentInstance.runPromise = new Promise((_resolve, reject) => { rejectRun = reject; });
  current.detectChanges();
  const run = [...current.nativeElement.querySelectorAll("button")].find((button) => button.textContent.trim() === "Run");
  run.click();
  current.detectChanges();
  assert.equal(run.disabled, true);
  rejectRun(new Error("Denied"));
  await Promise.resolve();
  await Promise.resolve();
  current.detectChanges();
  assert.equal(current.nativeElement.querySelector('[role="alert"]')?.textContent.trim(), "Run: Denied");
  assert.equal(run.disabled, false);
});

test("external loading is announced with a polite live region", async () => {
  const current = await createFixture();
  current.componentInstance.loading.set(true);
  current.detectChanges();
  const status = current.nativeElement.querySelector('[role="status"]');
  assert.equal(status.getAttribute("aria-live"), "polite");
  assert.match(status.textContent, /Loading configuration/);
});
