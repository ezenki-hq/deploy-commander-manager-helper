import assert from "node:assert/strict";
import test from "node:test";
import { openManagerInvocationSession } from "../packages/core/dist/index.js";

function wireFor({ caller = null, manager = "provider", metadata, failAt } = {}) {
  const calls = [];
  return {
    calls,
    async sendRPC(call) {
      calls.push(call.request);
      if (call.request === failAt) return { ok: false, error: { message: "denied" } };
      if (call.request === "getManager") return { ok: true, result: manager };
      if (call.request === "getCallingManager") return { ok: true, result: caller };
      if (call.request === "getMetadata") return { ok: true, result: metadata };
      throw new Error(call.request);
    },
    close(response) { calls.push(response); },
    end() {},
  };
}

test("standalone mode detects current manager and does not fetch metadata", async () => {
  const wire = wireFor();
  const session = await openManagerInvocationSession(wire);
  assert.equal(session.mode, "standalone");
  assert.deepEqual(wire.calls, ["getManager", "getCallingManager"]);
});

test("called mode validates metadata and completes exactly once with trusted manager", async () => {
  const wire = wireFor({ caller: "consumer", metadata: { key: "value" } });
  const session = await openManagerInvocationSession(wire, { parseMetadata: (value) => {
    if (!value || typeof value.key !== "string") throw new TypeError("invalid metadata");
    return value;
  } });
  assert.equal(session.mode, "called");
  assert.equal(session.context.callingManagerId, "consumer");
  session.context.complete({ connected: true });
  session.context.fail({ message: "later" });
  assert.deepEqual(wire.calls.at(-1), { manager: "provider", ok: true, result: { connected: true } });
  assert.equal(wire.calls.filter((call) => typeof call === "object").length, 1);
});

test("invalid called metadata rejects and leaves interface open", async () => {
  const wire = wireFor({ caller: "consumer", metadata: null });
  await assert.rejects(openManagerInvocationSession(wire, { parseMetadata() { throw Error("bad metadata"); } }), /bad metadata/);
  assert.equal(wire.calls.includes("getMetadata"), true);
  assert.equal(wire.calls.filter((call) => typeof call === "object").length, 0);
});

test("fail sends structured failure once", async () => {
  const wire = wireFor({ caller: "consumer", metadata: {} });
  const session = await openManagerInvocationSession(wire, { parseMetadata: (value) => value });
  session.context.fail({ message: "invalid operation", status: 409, details: { reason: "policy" } });
  assert.deepEqual(wire.calls.at(-1), { manager: "provider", ok: false, error: { message: "invalid operation", status: 409, details: { reason: "policy" } } });
});

test("called mode without a definition skips metadata and leaves completion to the manager", async () => {
  const wire = wireFor({ caller: "consumer" });
  const session = await openManagerInvocationSession(wire);
  assert.equal(session.mode, "called");
  assert.equal(session.context, undefined);
  assert.equal(wire.calls.includes("getMetadata"), false);
  assert.equal(wire.calls.filter((call) => typeof call === "object").length, 0);
});

test("invalid manager identity and failed metadata reads reject without closing", async () => {
  const invalid = wireFor({ caller: " consumer " });
  await assert.rejects(openManagerInvocationSession(invalid), /calling manager ID/);
  assert.equal(invalid.calls.filter((call) => typeof call === "object").length, 0);

  const failed = wireFor({ caller: "consumer", metadata: {}, failAt: "getMetadata" });
  await assert.rejects(openManagerInvocationSession(failed, { parseMetadata: (value) => value }), /denied/);
  assert.equal(failed.calls.filter((call) => typeof call === "object").length, 0);
});

test("result validation and abort keep terminal callbacks inert until a valid result is sent", async () => {
  const abort = new globalThis.AbortController();
  const wire = wireFor({ caller: "consumer", metadata: {} });
  const session = await openManagerInvocationSession(wire, { parseMetadata: (value) => value, validateResult: (result) => { if (!result.ready) throw Error("not ready"); } }, abort.signal);
  assert.throws(() => session.context.complete({ ready: false }), /not ready/);
  assert.equal(wire.calls.filter((call) => typeof call === "object").length, 0);
  abort.abort();
  session.context.complete({ ready: true });
  assert.equal(wire.calls.filter((call) => typeof call === "object").length, 0);
});
