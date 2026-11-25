import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const input = resolve(root, "styles/configuration.css");
const packages = ["react", "vue", "svelte", "angular"];

for (const name of packages) {
  const outputDirectory = resolve(root, "packages", name, "dist");
  const output = resolve(outputDirectory, "styles.css");
  mkdirSync(outputDirectory, { recursive: true });
  const result = spawnSync("npm", ["exec", "--", "tailwindcss", "-i", input, "-o", output, "--minify"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);

  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(`${output}.d.ts`, 'declare module "*.css";\nexport {};\n'));
}
