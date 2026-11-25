# Configuration Sections Implementation Plan

> Implement in Luna with Superpowers executing-plans or subagent-driven-development as appropriate. Track progress here and finish verification for all four frameworks.

**Goal** — Ship the same configuration section behavior and styling in React, Vue, Svelte, and Angular.

**Spec** — [Configuration Sections design and TypeScript API](../specs/2026-11-25-configuration-sections-design.md)

**Tech stack** — Strict TypeScript 5.9, React 19, Vue 3.5+, Svelte 5.20+, Angular 21, Tailwind CSS 4 CLI, npm workspaces.

## Constraints

- Each framework package exports ConfigurationSection, SectionActions, SectionStatus, and ConfigurationGroup. Angular also exports ConfigurationSectionBody. Reuse CoreActions and the shared section types. Keep platform calls and persistence inside explicitly supplied manager actions.
- Build and test with Node.js 22.12 or newer on the Node 22 line, or Node 24 LTS. Match native framework compilers and test tools with the approved framework versions.
- Keep the root build gate and Node tests for core. Add framework checks in order so clean builds do not rely on existing declaration artifacts. Use native lint parsers for Vue and Svelte, Angular template linting where applicable, and TypeScript for all adapter source.
- Create Connection, framework-specific manager functionality, and manager database storage are outside this change. Report the worktree and merge status if a worktree is used.

## Task 1 — Shared contracts, lifecycle, and styles

**Files** — `packages/core/src/configuration/`, core manifest, `styles/configuration.css`, root scripts and lockfile, and `test/configuration-lifecycle.test.mjs`.

- [x] Add tests for successful and rejected loading, abort on edit and replacement, an obsolete load settling after the latest request, action lock acquisition before a second call, sync and async errors, successful completion, and unmount before settlement. Verify the original structured error survives normalization until it is presented.
- [x] Add the shared types through `core/configuration` and bind them to `CoreActions`. Implement a load helper that takes a typed loader and callbacks, creates a fresh AbortSignal, and returns a cancellation function for that request. Implement per-instance action execution and locking, shared evaluation of visibility and disabled conditions, and a formatter for Error, structured RPC error, and unknown failure values. Keep framework reactivity and DOM state in adapters.
- [x] Add the Tailwind 4 input stylesheet. Generate stable `dcmsdk-` classes for the card, heading, body, fields, action row, variants, status, and responsive group. Use Tailwind `@apply` in the shared stylesheet so class generation does not depend on framework source or consumer scans. Use inherited SDK theme values, a system preference, and explicit nested light/dark overrides. Exclude Preflight. Define one build command that generates the same CSS and its side-effect declaration into each adapter's package output.
- [x] Ensure the workspace build orders core output before adapter type checking and compiles all projects before starting tests. Preserve zero-warning lint and fail the build when CSS generation or a native framework check fails. Verify clean builds without preexisting `dist` directories.

## Task 2 — React adapter

**Files** — `packages/react/src/`, React workspace manifest and tsconfig, and React section tests and consumer fixtures.

- [x] Add tests for root exports, controlled props, internal data, typed ref updates, loader cancellation under Strict Mode, visible/disabled/read-only action behavior, current data, pending guards, keyboard activation, status live regions, and grouping.
- [x] Enable TSX and React 19 peer support. Implement the four components with the exact React API from the spec and re-export shared types. Bind the typed `ref` to setData, render body children with the section context, and delegate operation status to SectionActions. Use the shared CSS classes and an explicit stylesheet export.
- [x] Run the component tests and compile positive and negative JSX fixtures for inferred data and ref types, action subtype mismatch, and conflicting data modes. Check SSR import works without loading CSS from the JavaScript entry point.

## Task 3 — Vue adapter

**Files** — `packages/vue/src/`, Vue workspace manifest, build and TypeScript config, and Vue section tests and consumer fixtures.

- [x] Add component and template fixtures for typed default slot data, the description slot, controlled updates through `sectionData`, internal loading, exposed setData, read-only actions, pending/error feedback, and group layout. Include native template type failures for mismatched action data and conflicting data modes.
- [x] Use Vue 3 generic SFCs with the typed slot and section input from the spec. Expose setData using `defineExpose`. Use a shallow data reference for internal state and watch loader identity only after mount. Cancel on teardown. Retain named component exports and shared state, status and styling semantics.
- [x] Build an ESM library with Vite's Vue plugin and emit declarations with vue-tsc. Keep Vue and core external. Verify runtime and types through the actual public entries with a Vue compiler-checked consumer. Export the compiled CSS separately.

## Task 4 — Svelte adapter

**Files** — `packages/svelte/src/`, Svelte workspace manifest and packaging/check config, and Svelte section tests and consumer fixtures.

- [x] Add component and template tests for generic props and snippets, controlled and internal updates, `bind:this` setData, read-only opt-in, load races, action pending/errors, and grouping. Use Svelte's checker for positive and negative template fixtures.
- [x] Use Svelte 5 generic `$props`, a typed `children` snippet, and an instance setData export. Keep edits and loader results distinct from caller props. Use per-instance IDs for the heading association. Export the four components, shared types, and compiled CSS. Package compiler-ready components and declarations with `@sveltejs/package`.
- [x] Verify installation, checking, and running with a Svelte-aware build. Adapt the existing package export smoke test to resolve that entry with its Svelte condition and exercise component imports with the Svelte compiler. Preserve normal plain Node smoke checks for standalone Node-compatible entry points.

## Task 5 — Angular adapter

**Files** — `packages/angular/src/`, Angular workspace manifest, Angular compiler and ng-packagr configuration, and Angular section tests and consumer fixtures.

- [x] Add component tests for signal inputs, a typed projected body template, controlled and internal data, template reference updates, lifecycle cleanup, read-only behavior, action conditions and pending feedback, and grouping. Add strict Angular template fixtures that reject incompatible action data, mixed data modes, and unavailable context fields.
- [x] Implement standalone components for the four standard exports. Use a generic ConfigurationSectionBody directive with the input and template context guard in the spec. Make the default body context the template's implicit value. Resolve the template from the consumer's section content and bind the same shared data lifecycle and action behavior. Run loader effects on the client and cancel on destroy.
- [x] Compile the library to Angular Package Format with ng-packagr and partial compilation. Include the CSS and declaration in the generated package, keep Angular runtime packages as peers, and verify a linked consumer build with strictTemplates. Pack the generated APF distribution, and exercise Angular through its compiler instead of relying on unlinked direct Node imports alone.

## Task 6 — Documentation and final verification

**Files** — README, AGENTS.md, package smoke tests, and temporary consumer applications.

- [x] Document the four import paths and stylesheet subpaths, peer and workspace toolchain requirements, idiomatic typed body and programmatic-update examples, CoreActions injection, field styles, themes, and the persistence boundary. Update the framework package descriptions in the README and AGENTS.md.
- [x] Run `npm ci` and `npm run build` with generated outputs cleared. Verify Node tests, typed templates, and native runtime tests are all invoked by the build. Independently verify lint, type, and test failures fail the root build with temporary changes.
- [x] Pack core and all four adapters and install the tarballs in temporary native framework consumers. Check typed component bodies, public exports, and stylesheet imports without Tailwind in React, Vue, Svelte, and strict-template Angular consumers.
- [ ] Inspect the packaged styles in a browser at narrow and wide widths and in light and dark themes. Browser execution is blocked in this container because Chromium cannot load missing system libraries (`libnspr4`, `libnss3`, ATK, and others); package indexes are unavailable for installing them. CSS output and responsive/theme/focus rules were checked statically.
- [x] Compare the finished changes against all six tasks and the spec. Verify packed assets and exports, remove temporary probes, and report build, type, and consumer results.
