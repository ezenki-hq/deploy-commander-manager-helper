# Deploy Commander Manager SDK Foundation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans when implementing inline, or superpowers:subagent-driven-development when the user chooses delegated execution. Switch to Luna before implementation. Track steps using the checkboxes below.

**Goal** — Establish five importable TypeScript packages and a single root build that fails on lint, type, or test errors.

**Architecture** — A private npm workspace root owns the scripts and development dependencies. Five sibling ESM packages each compile their own source into JavaScript and declarations. The core is framework-independent. The React, Vue, Svelte, and Angular packages reserve public entry points for future adapters.

**Spec** — [Deploy Commander Manager SDK Foundation](../specs/2026-11-25-manager-sdk-foundation-design.md).

## Tooling choice

npm workspaces and `tsc` cover package linking, declaration emission, and distribution artifacts for the current layout. ESLint handles linting, and Node's built-in test runner can exercise the actual compiled packages with no test transpiler. pnpm with a task runner could add dependency isolation, scheduling, and caching once the packages need them. npm keeps this foundation to one lockfile and a small set of shared scripts.

## Global constraints

- Use Node.js 22 or newer and npm workspaces. Use the existing checkout, which has an unborn `main` branch and untracked integration guides and container helpers.
- Keep each entry point an empty ESM module. SDK functions, action maps, UI components, installer-interface and runner integrations, and framework dependencies are out of scope.
- Keep the existing integration guides and container helpers intact. Verify packages locally without publishing.
- Use the public package name for consumer imports. Limit each package's published entry point to its package root.

## Review focus

- A clean install and build succeed without package outputs from an earlier run (Task 3).
- A strict TypeScript error causes the root build to fail at type checking (Task 2).
- A lint violation causes the root build to fail at linting (Task 2).
- A failing test causes the root build to fail after compilation (Task 2).
- A manager outside the workspace can resolve JavaScript and declarations from the five packed dependencies (Task 3).

## Task 1 — Create the workspace and package build

**Files** — Root `package.json`, `package-lock.json`, `.gitignore`, and `tsconfig.base.json`, plus `package.json`, `tsconfig.json`, and `src/index.ts` under each of `packages/core`, `packages/react`, `packages/vue`, `packages/svelte`, and `packages/angular`.

- [x] Create the private root manifest with workspaces at `packages/*`, a Node engine floor of 22, and shared dev dependencies `typescript` 5.9, `eslint` and `@eslint/js` 9, and `typescript-eslint` 8. Generate a single root lockfile through npm installation. Ignore `node_modules/` and generated `dist/` directories.
- [x] Configure shared TypeScript with `strict`, `noEmitOnError`, `declaration`, `verbatimModuleSyntax`, and `noUncheckedSideEffectImports`, with ES2022 output and NodeNext module and resolution settings. Use an ES2022 library baseline without framework or ambient Node types. Have each package extend the base config and set `rootDir` to `src`, `outDir` to `dist`, and its source include to `src/**/*.ts`.
- [x] For each package, use the public name `@ezenki/deploy-commander-manager-sdk-<package>` with one of the five directory names as the suffix. Set version `0.0.0`, ESM package type, and `files` to include `dist`. Set `exports["."].types` to `./dist/index.d.ts` before `exports["."].default` at `./dist/index.js`, and add a top-level `types` field pointing to the same declarations. Make its source entry point `export {}`. Give each workspace `compile` and `typecheck` scripts that run `tsc -p tsconfig.json` with emission and `tsc -p tsconfig.json --noEmit`, respectively.
- [x] Define root `compile` and `typecheck` scripts that run the corresponding script across all workspaces with no missing-script bypass. Run `npm install`, then `npm run typecheck` and `npm run compile`. Expect a successful exit and both entry artifacts in each package.

## Task 2 — Wire the required checks

**Files** — Root `eslint.config.mjs` and `package.json`, and `test/package-exports.test.mjs`.

- [x] Add one Node smoke test per public package name. Each test dynamically imports the bare package name and fails if the import rejects. Before wiring the root build, run `node --test` with a deliberately broken import in the smoke test to confirm it detects an unresolved package, then restore the correct name.
- [x] Configure ESLint flat config using the JavaScript and TypeScript recommended rule sets for their respective sources. Cover config, package source, and test files. Globally ignore dependency folders and generated output. Set root `lint` to `eslint . --max-warnings=0`.
- [x] Set root `test` to `npm run compile && node --test` so it works after installation from a clean checkout. Set root `build` to `npm run lint && npm run typecheck && npm test` so all three checks determine the exit status.
- [x] Run `npm run build` and expect all five package smoke tests to pass. Independently verify each failure mode by introducing one temporary change at a time and running the same root build. Use an exported function with an untyped parameter for the strict type error, an exported constant with an explicit `any` for the lint error, and a separate temporary `.test.mjs` file with a failing assertion for the test error. Confirm each run fails at the intended stage. Restore each file or remove the temporary test immediately after its check.

## Task 3 — Document the architecture and verify consumption

**Files** — Root `README.md` and `AGENTS.md`. Perform consumer checks in a temporary directory outside the repository.

- [x] In the README, explain how the foundation will reduce repeated manager integration logic, map each workspace to its public package name and future role, describe the installer-interface and runner boundaries, and show `npm ci`, `npm run build`, and individual development checks. Document ESM consumption and the initial empty entry points without implying registry publication.
- [x] In AGENTS.md, preserve the user's Sol/Luna, blocking question, jcodemunch, worktree, and implementation persistence instructions. Document strict type checking, public entry points, framework-free core, and the shared build gate. Link both integration guides and require future SDK work to use documented interface operations, preserve Deploy Commander's trusted manager identity and ownership enforcement, and use runs for state-changing operations. Explain that the manager plans deployment metadata and the runner applies it.
- [x] Run `npm ci` and `npm run build` after clearing only generated package `dist` directories. Pack all five workspaces to a temporary directory using `npm pack --workspaces --pack-destination <temp>`. Check the archives include each workspace's manifest, `dist/index.js`, and `dist/index.d.ts`. Install the five tarballs in a fresh ESM consumer outside the workspace. Import all five by public name at runtime, then type-check a consumer file that namespace-imports each package using strict NodeNext settings and the repository's compiler. These checks cover Node resolution, TypeScript declarations, and tarball contents independently of workspace symlinks.
- [x] Compare the workspace against every task and the requested scope. Inspect Git status and whitespace, ensure all canaries and temporary artifacts are gone, and record the clean install, green build, negative checks, package checks, and any remaining gaps in the handoff.
