import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.getComputedStyle = dom.window.getComputedStyle;

const Vue = await import("vue");
const { mount, flushPromises } = await import("@vue/test-utils");
const {
  ConfigurationGroup,
  ConfigurationSection,
  SectionActions,
  SectionStatus,
} = await import("../packages/vue/dist/index.js");

afterEach(() => globalThis.document.body.replaceChildren());

test("Vue package exports the four configuration components", () => {
  assert.equal(typeof ConfigurationSection, "object");
  assert.equal(typeof SectionActions, "object");
  assert.equal(typeof SectionStatus, "object");
  assert.equal(typeof ConfigurationGroup, "object");
});

test("typed scoped slots render description and controlled edits feed current action data", async () => {
  const changes = [];
  const received = [];
  const wrapper = mount(ConfigurationSection, {
    props: {
      title: "Profile",
      sectionData: { data: { name: "before" }, onDataChange: (next) => changes.push(next) },
      actions: { inspect: { label: "Inspect", execute: ({ data }) => { received.push(data.name); } } },
    },
    slots: {
      description: () => Vue.h("strong", "Details"),
      default: ({ data, setData }) => Vue.h("input", {
        value: data.name,
        onInput: (event) => setData({ name: event.target.value }),
      }),
    },
  });

  assert.equal(wrapper.find("strong").text(), "Details");
  await wrapper.find("input").setValue("after");
  assert.deepEqual(changes, [{ name: "after" }]);
  await wrapper.setProps({ sectionData: { data: { name: "after" }, onDataChange: (next) => changes.push(next) } });
  await wrapper.get("button").trigger("click");
  assert.deepEqual(received, ["after"]);
});

test("internal loader and exposed setData update the section data", async () => {
  const wrapper = mount(ConfigurationSection, {
    props: {
      title: "Internal",
      sectionData: { initialData: { name: "initial" }, loadData: async () => ({ name: "loaded" }) },
    },
    slots: { default: ({ data }) => Vue.h("p", data.name) },
  });

  await flushPromises();
  assert.equal(wrapper.find("p").text(), "loaded");
  wrapper.vm.setData({ name: "updated" });
  await Vue.nextTick();
  assert.equal(wrapper.find("p").text(), "updated");
});

test("loader is aborted when its section unmounts", async () => {
  let signal;
  const wrapper = mount(ConfigurationSection, {
    props: {
      title: "Pending",
      sectionData: {
        loadData: (requestSignal) => {
          signal = requestSignal;
          return new Promise(() => {});
        },
      },
    },
  });

  await Vue.nextTick();
  wrapper.unmount();
  assert.equal(signal.aborted, true);
});

test("read-only mode hides ordinary actions and permits explicit read-only actions", async () => {
  const called = [];
  const wrapper = mount(ConfigurationSection, {
    props: {
      title: "Read only",
      readOnly: true,
      sectionData: { initialData: { name: "locked" } },
      actions: {
        hidden: { label: "Hidden", execute: () => called.push("hidden") },
        allowed: { label: "Allowed", allowInReadOnly: true, execute: () => called.push("allowed") },
      },
    },
    slots: { default: ({ data }) => Vue.h("input", { value: data.name }) },
  });

  assert.equal(wrapper.find("button").text(), "Allowed");
  assert.equal(wrapper.find("input").element.matches(":disabled"), true);
  await wrapper.find("button").trigger("click");
  assert.deepEqual(called, ["allowed"]);
});

test("standalone actions lock during async execution and expose error feedback", async () => {
  let rejectAction;
  const wrapper = mount(SectionActions, {
    props: {
      data: { name: "current" },
      actions: { fail: { label: "Run", execute: () => new Promise((_, reject) => { rejectAction = reject; }) } },
    },
  });

  await wrapper.find("button").trigger("click");
  assert.equal((wrapper.find("button").element).disabled, true);
  rejectAction(new Error("Denied"));
  await flushPromises();
  assert.equal(wrapper.find('[role="alert"]').text(), "Run: Denied");
  assert.equal((wrapper.find("button").element).disabled, false);
});

test("status and group components expose shared presentation classes", () => {
  const status = mount(SectionStatus, { props: { status: { kind: "loading" } } });
  assert.equal(status.get('[role="status"]').attributes("aria-live"), "polite");
  const group = mount(ConfigurationGroup, { props: { columns: 2 }, slots: { default: "Child" } });
  assert.ok(group.classes().includes("dcmsdk-group-two"));
  assert.equal(group.text(), "Child");
});
