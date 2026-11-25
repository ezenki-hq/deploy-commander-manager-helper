# Repository guidance

## Collaboration workflow

- Use the Superpowers and jcodemunch tools when they apply. Use jcodemunch for repository context and impact exploration when its index is available. This repository may need indexing before repo queries return results.
- The first question is asked in Sol. Use Sol for planning and Luna for implementation. Tell the user when to switch models.
- Questions are blocking. When asking the user a question, stop work and wait for their response before investigating further, editing files, or proceeding on dependent work.
- If implementation uses a worktree, report whether it has been merged and give the user the option to merge it.
- After an approved plan, continue through implementation and verification. Do not stop at milestones or context transitions. Preserve unfinished work in the repository and resume from it after interruptions.
- Before completion, compare the implementation with the full approved plan and report unverified items.

## Architecture

This repository contains one SDK monorepo with five independently consumable packages:

- `@ezenki/deploy-commander-manager-sdk-core` is framework-independent.
- `@ezenki/deploy-commander-manager-sdk-react` contains React adapters and components.
- `@ezenki/deploy-commander-manager-sdk-vue` contains Vue adapters and components.
- `@ezenki/deploy-commander-manager-sdk-svelte` contains Svelte adapters and components.
- `@ezenki/deploy-commander-manager-sdk-angular` contains Angular adapters and components.

Framework packages depend on core for shared configuration contracts and lifecycle helpers. Core must remain independent of framework packages. Each UI package exposes its components/types at the package root and its prebuilt Tailwind stylesheet at the `./styles.css` export. Angular additionally exports the `ConfigurationSectionBody` template directive. Svelte's root export is compiler-ready and marked with the `svelte` condition. Keep exports deliberate and covered by package-consumer checks.

The framework packages implement `ConfigurationSection`, `SectionActions`, `SectionStatus`, `ConfigurationGroup`, `ConnectionSection`, `CreateConnectionSection`, and optional `ManagerInvocationSection`. Keep the UI adapters separate from Deploy Commander RPC and runner implementation details. Use shared core types and lifecycle behavior rather than duplicating contracts. Section bodies stay customizable through framework-native render functions, slots, snippets, or projected templates. Preserve strict data/action compatibility.

Connection integrations must retain the owner boundary: consumers read resource summaries and open the resource owner with `wire.startInterface()` to request a connection. Only the resource owner may load its private resource configuration or create its connection, using its own interface wire and trusted `getCallingManager()` result. Validate the returned connection against the authorized connection summaries before selecting it. Allow distinct connections for the same manager/resource pair. Generic manager invocation is optional and independent; when composed with a provider section, only the provider handles terminal close for the connection workflow.

Configuration fields do not persist automatically and do not trigger runs on change. Render only actions supplied by the manager; never silently add Save or Reset. Manager actions may use explicitly supplied `CoreActions`. Prefer Deploy Commander resources, connections, runs, history, labels, and frontend state. Add manager database storage only if those capabilities cannot represent the requirement, and document the reason before doing so.

Import each adapter's published stylesheet through its package subpath, for example `@ezenki/deploy-commander-manager-sdk-react/styles.css`. Consumers must not need Tailwind or SDK-source scan configuration. Use the shared `dcmsdk-` class names and CSS variables for component-consistent fields. Themes follow system color preference by default; an ancestor can set `data-dcmsdk-theme="light"` or `data-dcmsdk-theme="dark"`.

## Deploy Commander integration rules

Read the [manager interface guide](docs/integrations/MANAGER_INTERFACE_GUIDE.md) and [runner implementation guide](docs/integrations/DEPLOYMENT_RUNNER_IMPLEMENTATION_GUIDE.md) before implementing integrations.

- Use documented operations from `@ezenki/deploy-commander-installer-interface`. Do not call Deploy Commander APIs directly from manager UI code.
- Deploy Commander supplies trusted current-manager identity. Never accept a caller-provided manager identity for scoped operations. Respect ownership and access checks enforced by the platform interface.
- Use runs for installations, configuration changes, teardown, and other state changes. Do not start runs for read-only inspection or retrieval.
- Manager code plans complete deployment metadata. `ezenki/deploy-commander-runner` applies that metadata and owns Docker and agent operations. Do not duplicate runner naming or Docker behavior in manager code.

## Development checks

Use Node.js 22.12+ on Node 22, or Node.js 24+, with npm workspaces. Runtime framework peers are React 19, Vue 3.5+, Svelte 5.20+, and Angular 21+. Run `npm ci` to install and `npm run build` before reporting a change complete. The build runs ESLint with zero warnings, strict TypeScript and framework-template checks, compilation, package-export checks, and native runtime tests. A failure in any stage must fail the build.

Shared TypeScript settings live in `tsconfig.base.json`. Keep each package's TypeScript config extending that base. Keep source in `packages/<name>/src`, generated output in ignored `dist` folders, and package exports rooted at `.`. Keep CSS source in `styles/`; generated package styles and declarations are build artifacts. Preserve strict mode and add both positive and negative consumer fixtures when changing public generic APIs.
