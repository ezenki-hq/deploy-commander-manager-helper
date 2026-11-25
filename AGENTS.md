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

Framework packages may depend on core when using shared functionality. Core must remain independent of framework packages. Each package exposes its public API from its root entry point. Keep public exports deliberate and covered by package-consumer checks.

The core package exports the shared typed actions object. The framework package entry points remain empty. Do not add manager-specific behavior or frontend components to core.

## Deploy Commander integration rules

Read the [manager interface guide](docs/integrations/MANAGER_INTERFACE_GUIDE.md) and [runner implementation guide](docs/integrations/DEPLOYMENT_RUNNER_IMPLEMENTATION_GUIDE.md) before implementing integrations.

- Use documented operations from `@ezenki/deploy-commander-installer-interface`. Do not call Deploy Commander APIs directly from manager UI code.
- Deploy Commander supplies trusted current-manager identity. Never accept a caller-provided manager identity for scoped operations. Respect ownership and access checks enforced by the platform interface.
- Use runs for installations, configuration changes, teardown, and other state changes. Do not start runs for read-only inspection or retrieval.
- Manager code plans complete deployment metadata. `ezenki/deploy-commander-runner` applies that metadata and owns Docker and agent operations. Do not duplicate runner naming or Docker behavior in manager code.

## Development checks

Use Node.js 22 or newer with npm workspaces. Run `npm ci` to install and `npm run build` before reporting a change complete. The build runs ESLint with zero warnings, strict TypeScript checks, compilation, and tests of the compiled package exports. A failure in any stage must fail the build.

Shared TypeScript settings live in `tsconfig.base.json`. Keep each package's TypeScript config extending that base. Keep source in `packages/<name>/src`, generated output in ignored `dist` folders, and package exports rooted at `.`.
