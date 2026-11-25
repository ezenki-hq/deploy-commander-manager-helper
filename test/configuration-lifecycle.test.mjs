import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate as waitImmediate } from "node:timers/promises";

import {
  createSectionActionRunner,
  formatSectionError,
  getSectionActionState,
  runSectionLoader,
} from "../packages/core/dist/configuration/lifecycle.js";

test("action state evaluates visibility, disabled conditions and read-only opt-in", () => {
  const data = { configured: true };
  const action = {
    label: "Deploy",
    visible: (value) => value.configured,
    disabled: (value) => !value.configured,
    execute: () => {},
  };

  assert.deepEqual(getSectionActionState(action, data), { visible: true, disabled: false });
  assert.deepEqual(getSectionActionState(action, data, { readOnly: true }), { visible: false, disabled: false });
  assert.deepEqual(getSectionActionState({ ...action, allowInReadOnly: true }, data, { readOnly: true, disabled: true }), { visible: true, disabled: true });
  assert.deepEqual(getSectionActionState({ ...action, visible: false }, data), { visible: false, disabled: false });
});

test("section loader applies a successful result", async () => {
  const loaded = [];
  const failed = [];

  runSectionLoader(async () => ({ name: "ready" }), {
    onData: (data) => loaded.push(data),
    onError: (error) => failed.push(error),
  });

  await waitImmediate();
  assert.deepEqual(loaded, [{ name: "ready" }]);
  assert.deepEqual(failed, []);
});

test("section loader reports a rejected result", async () => {
  const failure = { code: "RESOURCE_UNAVAILABLE", message: "Not available" };
  const failed = [];

  runSectionLoader(() => Promise.reject(failure), {
    onData: () => assert.fail("failed load must not update data"),
    onError: (error) => failed.push(error),
  });

  await waitImmediate();
  assert.deepEqual(failed, [failure]);
  assert.equal(formatSectionError(failed[0]), "Not available");
});

test("cancelling a section load aborts it and suppresses later callbacks", async () => {
  let signal;
  let resolveLoad;
  const loaded = [];
  const cancel = runSectionLoader((requestSignal) => {
    signal = requestSignal;
    return new Promise((resolve) => { resolveLoad = resolve; });
  }, {
    onData: (data) => loaded.push(data),
    onError: assert.fail,
  });

  cancel();
  resolveLoad({ name: "stale" });
  await waitImmediate();
  assert.equal(signal.aborted, true);
  assert.deepEqual(loaded, []);
});

test("a replaced load cannot overwrite the newer result", async () => {
  const requests = [];
  const loaded = [];
  const callbacks = {
    onData: (data) => loaded.push(data),
    onError: assert.fail,
  };
  const firstCancel = runSectionLoader(() => new Promise((resolve) => requests.push(resolve)), callbacks);
  runSectionLoader(() => new Promise((resolve) => requests.push(resolve)), callbacks);

  firstCancel();
  requests[1]({ version: 2 });
  requests[0]({ version: 1 });
  await waitImmediate();
  assert.deepEqual(loaded, [{ version: 2 }]);
});

test("action runner locks synchronously and marks successful completion", async () => {
  const statuses = [];
  const runner = createSectionActionRunner((status) => statuses.push(status));
  let finish;
  const first = runner.run("Deploy", () => new Promise((resolve) => { finish = resolve; }));
  const second = await runner.run("Delete", () => assert.fail("concurrent action must not run"));

  assert.equal(second, false);
  assert.equal(runner.pending, true);
  assert.deepEqual(statuses, [{ kind: "pending", label: "Deploy" }]);
  finish();
  assert.equal(await first, true);
  assert.equal(runner.pending, false);
  assert.deepEqual(statuses.at(-1), { kind: "success", label: "Deploy" });
});

test("action runner reports synchronous and asynchronous failures", async () => {
  const failure = { code: "FORBIDDEN", message: "Not authorized" };
  const statuses = [];
  const runner = createSectionActionRunner((status) => statuses.push(status));

  assert.equal(await runner.run("Sync", () => { throw failure; }), false);
  assert.equal(await runner.run("Async", () => Promise.reject(new Error("Network error"))), false);
  assert.deepEqual(statuses, [
    { kind: "pending", label: "Sync" },
    { kind: "error", error: failure, label: "Sync" },
    { kind: "pending", label: "Async" },
    { kind: "error", error: new Error("Network error"), label: "Async" },
  ]);
  assert.equal(runner.pending, false);
});

test("error presentation handles Error, structured RPC errors and unknown values", () => {
  assert.equal(formatSectionError(new Error("Failed")), "Failed");
  assert.equal(formatSectionError({ code: "NOT_FOUND", message: "Missing" }), "Missing");
  assert.equal(formatSectionError({ code: "NOT_FOUND" }), "The operation could not be completed.");
  assert.equal(formatSectionError("unexpected"), "The operation could not be completed.");
});
