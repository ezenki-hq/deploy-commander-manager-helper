import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { JSDOM } from "jsdom";
import { setTimeout as delay } from "node:timers/promises";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });

const React = await import("react");
const { cleanup, fireEvent, render, screen, waitFor } = await import("@testing-library/react");
const userEvent = (await import("@testing-library/user-event")).default;
const {
  ConfigurationGroup,
  ConfigurationSection,
  SectionActions,
  SectionStatus,
} = await import("../packages/react/dist/index.js");

afterEach(() => cleanup());

test("React package exports the four configuration components", () => {
  assert.equal(typeof ConfigurationSection, "function");
  assert.equal(typeof SectionActions, "function");
  assert.equal(typeof SectionStatus, "function");
  assert.equal(typeof ConfigurationGroup, "function");
});

test("controlled section edits call onDataChange and actions receive current data", async () => {
  const changes = [];
  const received = [];
  const actions = {
    inspect: {
      label: "Inspect",
      execute: ({ data }) => received.push(data.name),
    },
  };
  const view = render(React.createElement(ConfigurationSection, {
    title: "Profile",
    data: { name: "before" },
    onDataChange: (next) => changes.push(next),
    actions,
    children: ({ data, setData }) => React.createElement("input", {
      "aria-label": "Name",
      value: data.name,
      onChange: (event) => setData({ name: event.target.value }),
    }),
  }));

  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "after" } });
  view.rerender(React.createElement(ConfigurationSection, {
    title: "Profile",
    data: { name: "after" },
    onDataChange: (next) => changes.push(next),
    actions,
    children: ({ data, setData }) => React.createElement("input", {
      "aria-label": "Name",
      value: data.name,
      onChange: (event) => setData({ name: event.target.value }),
    }),
  }));
  await React.act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Inspect" }));
    await Promise.resolve();
  });
  assert.deepEqual(changes, [{ name: "after" }]);
  assert.deepEqual(received, ["after"]);
});

test("internal section accepts initial data and a typed host ref update", async () => {
  const ref = React.createRef();
  render(React.createElement(ConfigurationSection, {
    ref,
    title: "Internal",
    initialData: { name: "initial" },
    children: ({ data }) => React.createElement("p", null, data.name),
  }));

  await React.act(async () => ref.current.setData({ name: "updated" }));
  assert.equal(screen.getByText("updated").textContent, "updated");
});

test("loader runs under Strict Mode and cancelled results do not replace newer data", async () => {
  const signals = [];
  let resolveFirst;
  const loadData = (signal) => {
    signals.push(signal);
    if (signals.length === 1) return new Promise((resolve) => { resolveFirst = resolve; });
    return Promise.resolve({ name: "loaded" });
  };
  render(React.createElement(React.StrictMode, null,
    React.createElement(ConfigurationSection, {
      title: "Loaded",
      initialData: { name: "initial" },
      loadData,
      children: ({ data }) => React.createElement("p", null, data.name),
    }),
  ));

  await waitFor(() => assert.equal(screen.getByText("loaded").textContent, "loaded"));
  assert.ok(signals.some((signal) => signal.aborted));
  await React.act(async () => {
    resolveFirst({ name: "stale" });
    await Promise.resolve();
  });
  assert.equal(screen.getByText("loaded").textContent, "loaded");
});

test("read-only section hides actions unless explicitly allowed", async () => {
  const called = [];
  render(React.createElement(ConfigurationSection, {
    title: "Read only",
    initialData: { name: "locked" },
    readOnly: true,
    actions: {
      hidden: { label: "Hidden", execute: () => called.push("hidden") },
      allowed: { label: "Allowed", allowInReadOnly: true, execute: () => called.push("allowed") },
    },
      children: ({ data }) => React.createElement("input", { "aria-label": "Name", value: data.name, onChange: () => undefined }),
  }));

  assert.equal(screen.queryByRole("button", { name: "Hidden" }), null);
  assert.equal(screen.getByRole("textbox", { name: "Name" }).matches(":disabled"), true);
  await React.act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Allowed" }));
    await Promise.resolve();
  });
  assert.deepEqual(called, ["allowed"]);
});

test("action conditions, keyboard activation and pending state prevent repeated activation", async () => {
  let finish;
  let calls = 0;
  render(React.createElement(SectionActions, {
    data: { enabled: true },
    actions: {
      hidden: { label: "Hidden", visible: false, execute: () => assert.fail("hidden action ran") },
      deploy: {
        label: "Deploy",
        disabled: (data) => !data.enabled,
        execute: () => {
          calls += 1;
          return new Promise((resolve) => { finish = resolve; });
        },
      },
    },
  }));

  const button = screen.getByRole("button", { name: "Deploy" });
  const user = userEvent.setup();
  button.focus();
  await user.keyboard("{Enter}");
  await user.click(button);
  assert.equal(calls, 1);
  assert.equal(button.disabled, true);
  assert.equal(screen.queryByRole("button", { name: "Hidden" }), null);
  await React.act(async () => {
    finish();
    await delay(0);
  });
  await waitFor(() => assert.ok(screen.getByText("Deploy complete")));
  assert.equal(button.disabled, false);
});

test("status uses a live region and error alert", () => {
  const { rerender } = render(React.createElement(SectionStatus, { status: { kind: "loading" } }));
  assert.equal(screen.getByRole("status").getAttribute("aria-live"), "polite");

  rerender(React.createElement(SectionStatus, { status: { kind: "error", error: new Error("Denied") } }));
  assert.equal(screen.getByRole("alert").textContent, "Denied");
});

test("configuration group supports its responsive two-column variant", () => {
  const { container } = render(React.createElement(ConfigurationGroup, { columns: 2 },
    React.createElement("div", null, "One"),
    React.createElement("div", null, "Two"),
  ));
  assert.equal(container.firstElementChild.className, "dcmsdk-group dcmsdk-group-two");
  assert.equal(screen.getByText("One").textContent, "One");
});
