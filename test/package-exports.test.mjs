import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("core package exposes an importable entry point", async () => {
  await assert.doesNotReject(import("@ezenki/deploy-commander-manager-sdk-core"));
});

test("react package exposes an importable entry point", async () => {
  await assert.doesNotReject(import("@ezenki/deploy-commander-manager-sdk-react"));
});

test("vue package exposes an importable entry point", async () => {
  await assert.doesNotReject(import("@ezenki/deploy-commander-manager-sdk-vue"));
});

test("svelte package exposes a compiler-aware Svelte entry point", async () => {
  const manifest = JSON.parse(await readFile(resolve(repositoryRoot, "packages/svelte/package.json"), "utf8"));
  assert.equal(manifest.exports["."].svelte, "./dist/index.js");
  assert.equal(manifest.exports["."].types, "./dist/index.d.ts");
});

test("angular package exposes an importable entry point", async () => {
  const manifest = JSON.parse(await readFile(resolve(repositoryRoot, "packages/angular/dist/package.json"), "utf8"));
  assert.ok(manifest.exports["."].default.endsWith(".mjs"));
  assert.equal(manifest.exports["./styles.css"].default, "./styles.css");
});
