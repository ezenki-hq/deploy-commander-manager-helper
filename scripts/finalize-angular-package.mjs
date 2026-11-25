import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = resolve(root, "packages/angular");
const outputRoot = resolve(packageRoot, "dist");
const packagePath = resolve(outputRoot, "package.json");
const sourcePath = resolve(packageRoot, "package.json");
const outputManifest = JSON.parse(await readFile(packagePath, "utf8"));
const sourceManifest = JSON.parse(await readFile(sourcePath, "utf8"));
const entry = outputManifest.exports["."];
const typesPath = entry.types;
const jsPath = entry.default;

outputManifest.files = ["**/*"];
outputManifest.types = typesPath;
outputManifest.typings = typesPath;
outputManifest.exports["./styles.css"] = {
  types: "./styles.css.d.ts",
  default: "./styles.css",
};
sourceManifest.types = `./dist/${typesPath.replace(/^\.\//, "")}`;
sourceManifest.exports = {
  ".": {
    types: `./dist/${typesPath.replace(/^\.\//, "")}`,
    default: `./dist/${jsPath.replace(/^\.\//, "")}`,
  },
  "./styles.css": {
    types: "./dist/styles.css.d.ts",
    default: "./dist/styles.css",
  },
};

await Promise.all([
  writeFile(packagePath, `${JSON.stringify(outputManifest, null, 2)}\n`),
  writeFile(sourcePath, `${JSON.stringify(sourceManifest, null, 2)}\n`),
]);
