# Deploy Commander Manager SDK Foundation

## Purpose

Deploy Commander managers will consume a shared SDK to reuse platform integration code and framework components. Future SDK contracts should expose supported operations, preserve manager ownership rules, and make incorrect integration harder for developers and coding agents. This phase establishes the package boundaries and development tooling.

## Package boundaries

The monorepo houses one SDK with five separately installable packages. A manager will choose the library for its framework and use the core directly when it needs framework-independent APIs.

| Workspace | Package | Intended responsibility |
| --- | --- | --- |
| `packages/core` | `@ezenki/deploy-commander-manager-sdk-core` | Shared TypeScript contracts and framework-independent integration for resources, connections, runs, and runner configuration |
| `packages/react` | `@ezenki/deploy-commander-manager-sdk-react` | React components that use the shared core contracts |
| `packages/vue` | `@ezenki/deploy-commander-manager-sdk-vue` | Vue components that use the shared core contracts |
| `packages/svelte` | `@ezenki/deploy-commander-manager-sdk-svelte` | Svelte components that use the shared core contracts |
| `packages/angular` | `@ezenki/deploy-commander-manager-sdk-angular` | Angular components that use the shared core contracts |

Each package ships an empty ESM entry point and its TypeScript declaration in the foundation. As features are added, the framework packages will depend on core where they need shared behavior and declare their framework dependencies then. The core will remain independent of the four framework packages.

## Integration boundaries

Future core functionality will use `@ezenki/deploy-commander-installer-interface` for documented platform operations. Deploy Commander supplies trusted manager identity and enforces resource and connection access. The manager plans deployment metadata for state-changing runs, and `ezenki/deploy-commander-runner` applies that metadata. The local guides define these boundaries. [Manager interface guide](../../integrations/MANAGER_INTERFACE_GUIDE.md) · [Runner implementation guide](../../integrations/DEPLOYMENT_RUNNER_IMPLEMENTATION_GUIDE.md)

SDK functions, action maps, UI components, feature-level contracts, framework dependencies, and installer-interface or runner integrations are outside this phase.

## Tooling approach

Use a private npm workspace root, one lockfile, and Node.js 22 or newer. Share TypeScript and ESLint configuration across the packages. TypeScript handles strict checking and emits ESM JavaScript and declarations. ESLint treats warnings as build failures. Node's built-in test runner checks the compiled package entry points.

pnpm with a task runner is another option if dependency isolation or build caching becomes important. npm workspaces cover linking, packaging, and shared commands for the five packages without a separate task runner.

## Acceptance criteria

- A clean checkout supports `npm ci` followed by `npm run build`.
- Introducing a type error, a lint violation, or a failing test independently causes the root build to exit nonzero.
- A separate ESM consumer can install all five packed libraries, import them by package name, and resolve their declarations with strict TypeScript.
- README.md documents the architecture, package names, scope, and development commands. AGENTS.md preserves the repository workflow and records the SDK's integration and ownership conventions.
- The two integration guides and local container tooling remain intact. Packaging is verified locally.
