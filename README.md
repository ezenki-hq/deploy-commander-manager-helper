# Deploy Commander Manager SDK

A TypeScript monorepo for reusable libraries and framework packages used by managers that integrate with Deploy Commander. The SDK is intended to reduce repeated integration code and provide contracts that guide developers and coding agents toward supported operations and manager ownership rules.

## Packages

Each package is independently installable. This foundation provides empty ESM entry points and TypeScript declarations. It does not yet implement SDK functions or UI components.

| Package | Purpose |
| --- | --- |
| [`@ezenki/deploy-commander-manager-sdk-core`](packages/core) | Framework-independent contracts and integrations for resources, connections, runs, and runner configuration |
| [`@ezenki/deploy-commander-manager-sdk-react`](packages/react) | React components built on shared core contracts |
| [`@ezenki/deploy-commander-manager-sdk-vue`](packages/vue) | Vue components built on shared core contracts |
| [`@ezenki/deploy-commander-manager-sdk-svelte`](packages/svelte) | Svelte components built on shared core contracts |
| [`@ezenki/deploy-commander-manager-sdk-angular`](packages/angular) | Angular components built on shared core contracts |

Framework packages will depend on core when they use shared functionality. Core stays independent of framework libraries. Framework dependencies will be added as corresponding components are implemented.

## Integration boundaries

Core integrations will use documented operations from `@ezenki/deploy-commander-installer-interface`. Deploy Commander provides the trusted manager context and enforces ownership and access. Managers prepare deployment metadata for state-changing operations. `ezenki/deploy-commander-runner` applies the supplied plan.

See the [manager interface guide](docs/integrations/MANAGER_INTERFACE_GUIDE.md) and [runner implementation guide](docs/integrations/DEPLOYMENT_RUNNER_IMPLEMENTATION_GUIDE.md) before adding integrations.

## Development

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm run build
```

The root build runs lint, strict type checking, compilation, and package import tests. Any failed stage exits nonzero.

Individual checks are available with `npm run lint`, `npm run typecheck`, `npm run compile`, and `npm test`. Package-level `compile` and `typecheck` scripts can also be run with npm workspace commands, for example `npm run compile --workspace=@ezenki/deploy-commander-manager-sdk-core`.

Packages use ESM and expose their root entry point with matching JavaScript and TypeScript declaration files. The package names and exports are ready for dependency consumption after distribution. This repository foundation has not published these packages to a registry.
