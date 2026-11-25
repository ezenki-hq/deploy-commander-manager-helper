import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compiler = resolve(root, "node_modules/typescript/bin/tsc");
const common = [
  "--noEmit",
  "--strict",
  "--skipLibCheck",
  "--target", "ES2022",
  "--module", "NodeNext",
  "--moduleResolution", "NodeNext",
  "--jsx", "react-jsx",
  "--lib", "ES2022,DOM",
];

const positive = spawnSync(process.execPath, [compiler, ...common, resolve(root, "packages/react/test-types/positive.tsx")], {
  cwd: root,
  encoding: "utf8",
});
if (positive.status !== 0) {
  process.stderr.write(positive.stdout ?? "");
  process.stderr.write(positive.stderr ?? "");
  process.exit(positive.status ?? 1);
}

const negative = spawnSync(process.execPath, [compiler, ...common, resolve(root, "packages/react/test-types/negative.tsx")], {
  cwd: root,
  encoding: "utf8",
});
if (negative.status === 0) {
  throw new Error("React negative type fixture unexpectedly compiled successfully.");
}
const diagnostics = `${negative.stdout ?? ""}${negative.stderr ?? ""}`;
if (!diagnostics.includes("not assignable") || !diagnostics.includes("initialData")) {
  process.stderr.write(diagnostics);
  throw new Error("React negative type fixture did not reject both incompatible actions and conflicting data modes.");
}
