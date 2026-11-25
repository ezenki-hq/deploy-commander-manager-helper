import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = resolve(root, "packages/angular");
const ngc = resolve(root, "node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js");

const positive = spawnSync(process.execPath, [ngc, "-p", resolve(packageRoot, "tsconfig.type-tests.json")], {
  cwd: packageRoot,
  encoding: "utf8",
});
if (positive.status !== 0) {
  process.stderr.write(positive.stdout ?? "");
  process.stderr.write(positive.stderr ?? "");
  process.exit(positive.status ?? 1);
}

const negative = spawnSync(process.execPath, [ngc, "-p", resolve(packageRoot, "tsconfig.negative-type-tests.json")], {
  cwd: packageRoot,
  encoding: "utf8",
});
if (negative.status === 0) throw new Error("Angular negative template fixture unexpectedly compiled successfully.");
const diagnostics = `${negative.stdout ?? ""}${negative.stderr ?? ""}`;
if (
  !diagnostics.includes("[actions]") ||
  !diagnostics.includes("SectionAction<OtherData>") ||
  !diagnostics.includes("NoInfer<Profile>") ||
  !diagnostics.includes("initialData") ||
  !diagnostics.includes("unavailable")
) {
  process.stderr.write(diagnostics);
  throw new Error("Angular negative template fixture did not reject mismatched actions, mixed data modes, and unavailable context fields.");
}
