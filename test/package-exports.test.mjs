import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("core package exposes actions and shared connection/invocation lifecycles", async () => {
  const core = await import("@ezenki/deploy-commander-manager-sdk-core");
  for (const name of ["createCoreActions", "createConnectionConsumerActions", "openConnectionProviderSession", "createConnectionSelectionController", "openManagerInvocationSession"]) assert.equal(typeof core[name], "function");
});

test("React package exposes configuration, connection, and invocation components", async () => {
  const react = await import("@ezenki/deploy-commander-manager-sdk-react");
  for (const name of ["ConfigurationSection", "ConnectionSection", "CreateConnectionSection", "ManagerInvocationSection"]) assert.equal(typeof react[name], "function");
});

test("Vue package exposes configuration, connection, and invocation components", async () => {
  const vue = await import("@ezenki/deploy-commander-manager-sdk-vue");
  for (const name of ["ConfigurationSection", "ConnectionSection", "CreateConnectionSection", "ManagerInvocationSection"]) assert.ok(vue[name]);
});

test("svelte package exposes a compiler-aware Svelte entry point", async () => {
  const manifest = JSON.parse(await readFile(resolve(repositoryRoot, "packages/svelte/package.json"), "utf8"));
  assert.equal(manifest.exports["."].svelte, "./dist/index.js");
  assert.equal(manifest.exports["."].types, "./dist/index.d.ts");
  const entry = await readFile(resolve(repositoryRoot, "packages/svelte/src/index.ts"), "utf8");
  for (const name of ["ConnectionSection", "CreateConnectionSection", "ManagerInvocationSection"]) assert.ok(entry.includes(name));
});

test("angular package exposes an importable entry point", async () => {
  const manifest = JSON.parse(await readFile(resolve(repositoryRoot, "packages/angular/dist/package.json"), "utf8"));
  assert.ok(manifest.exports["."].default.endsWith(".mjs"));
  assert.equal(manifest.exports["./styles.css"].default, "./styles.css");
  const entry = await readFile(resolve(repositoryRoot, "packages/angular/src/index.ts"), "utf8");
  for (const name of ["ConnectionSection", "CreateConnectionSection", "CreateConnectionSectionBody", "ManagerInvocationSection", "ManagerInvocationCalledBody"]) assert.ok(entry.includes(name));
});
