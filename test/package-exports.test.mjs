import assert from "node:assert/strict";
import test from "node:test";

test("core package exposes an importable entry point", async () => {
  await assert.doesNotReject(import("@ezenki/deploy-commander-manager-sdk-core"));
});

test("react package exposes an importable entry point", async () => {
  await assert.doesNotReject(import("@ezenki/deploy-commander-manager-sdk-react"));
});

test("vue package exposes an importable entry point", async () => {
  await assert.doesNotReject(import("@ezenki/deploy-commander-manager-sdk-vue"));
});

test("svelte package exposes an importable entry point", async () => {
  await assert.doesNotReject(import("@ezenki/deploy-commander-manager-sdk-svelte"));
});

test("angular package exposes an importable entry point", async () => {
  await assert.doesNotReject(import("@ezenki/deploy-commander-manager-sdk-angular"));
});
