import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checker = resolve(root, "node_modules/vue-tsc/bin/vue-tsc.js");

function check(config) {
  return spawnSync(process.execPath, [checker, "--noEmit", "-p", resolve(root, config)], {
    cwd: root,
    encoding: "utf8",
  });
}

const positive = check("packages/vue/tsconfig.type-tests.json");
if (positive.status !== 0) {
  process.stderr.write(positive.stdout ?? "");
  process.stderr.write(positive.stderr ?? "");
  process.exit(positive.status ?? 1);
}

const negative = spawnSync(process.execPath, [
  checker,
  "--noEmit",
  "--strict",
  "--skipLibCheck",
  "--target", "ES2022",
  "--module", "ESNext",
  "--moduleResolution", "Bundler",
  "--lib", "ES2022,DOM",
  resolve(root, "packages/vue/test-types/negative.vue"),
], { cwd: root, encoding: "utf8" });
if (negative.status === 0) throw new Error("Vue negative template fixture unexpectedly compiled successfully.");
const diagnostics = `${negative.stdout ?? ""}${negative.stderr ?? ""}`;
if (!diagnostics.includes("does not exist") && !diagnostics.includes("not assignable")) {
  process.stderr.write(diagnostics);
  throw new Error("Vue negative template fixture did not report its incompatible data and action inputs.");
}
