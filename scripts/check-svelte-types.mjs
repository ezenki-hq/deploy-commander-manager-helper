import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = resolve(root, "packages/svelte");

function check(config) {
  return spawnSync("npm", [
    "exec", "--", "svelte-check",
    "--workspace", packageRoot,
    "--tsconfig", config,
    "--config", resolve(packageRoot, "svelte.config.js"),
    "--output", "machine",
  ], { cwd: packageRoot, encoding: "utf8" });
}

const positive = check(resolve(packageRoot, "tsconfig.type-tests.json"));
if (positive.status !== 0) {
  process.stderr.write(positive.stdout ?? "");
  process.stderr.write(positive.stderr ?? "");
  process.exit(positive.status ?? 1);
}

const negative = check(resolve(packageRoot, "tsconfig.negative-type-tests.json"));
if (negative.status === 0) throw new Error("Svelte negative component fixture unexpectedly passed type checking.");
const diagnostics = `${negative.stdout ?? ""}${negative.stderr ?? ""}`;
if (!diagnostics.includes("assignable to type 'undefined'") || !diagnostics.includes("identifier")) {
  process.stderr.write(diagnostics);
  throw new Error("Svelte negative component fixture did not reject mismatched actions and mixed data modes.");
}
