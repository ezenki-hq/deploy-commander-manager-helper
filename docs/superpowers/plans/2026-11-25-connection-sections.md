# Connection and Manager Invocation Sections Implementation Plan

> Use Superpowers executing-plans or subagent-driven-development in Luna. Track progress using the task checkboxes and verify the entire plan before reporting completion.

**Completion review (2026-11-25)** — The core lifecycles, all four adapters, declarations, docs, styles, and tests are implemented. `npm run build` passed, including lint, strict type checks, compilation, root tests, Angular runtime tests, and Svelte runtime tests. The requested behavior is tested with native framework harnesses; the proposed shared two-wire test helper was omitted because each framework requires its own rendering harness. The core tests exercise the shared authorization, metadata, failure, and cleanup paths.

**Goal** — Let React, Vue, Svelte, and Angular managers select existing connections and create new connections through the resource owner's child interface. Add optional standalone and called views for any manager.

**Architecture** — Core binds each workflow to its own wire, verifies identity and authorization, and shares selection and invocation lifecycle logic. The four adapters use their framework's configuration section components for forms and feedback.

**Spec** — [Connection Sections and TypeScript contracts](../specs/2026-11-25-connection-sections-design.md)

## Constraints

- Reuse the checked SDK queries, existing create RPC, interface lifecycle, and prebuilt configuration stylesheet. Ship both components in React 19, Vue 3.5+, Svelte 5.20+, and Angular 21 through the existing package entry points.
- The consumer always opens the owning manager for creation. Its code can read public resource summaries and authorized connection summaries. The provider reads the private owned resource and derives the caller identity through the RPC context.
- Creation and deletion are explicit, and multiple connection IDs for the same pair are supported. Keep the existing core SDK API compatible. Keep the current dependency footprint unless a direct declaration dependency is needed.
- `ManagerInvocationSection` is optional and independent. Either display mode can be omitted. When it contains `CreateConnectionSection`, the provider owns connection completion. The wrapper does not create a connection or close the child on the provider's behalf.

## Task 1 — Core consumer workflow

**Files** — Add `packages/core/src/connections/types.ts`, `packages/core/src/connections/consumer.ts`, `packages/core/src/connections/protocol.ts`, and `test/connection-consumer.test.mjs`. Update `packages/core/src/index.ts`.

- [x] Implement and test the consumer wire workflow, exact owner/resource checks, authorized refresh, and rejection paths. Core tests verify the owner handoff, selection refresh, cancellation/failure, paginated summaries, and that private resource access and consumer-side creation are not used.

## Task 2 — Core provider session

**Files** — Add `packages/core/src/connections/provider.ts` and `test/connection-provider.test.mjs`. Export the provider session and its public types from core.

- [x] Implement and test provider identity, resource ownership, filtered reads, authorized create/delete, duplicate mutation locking, cancellation, and minimal terminal results. Core consumer/provider workflows and each framework's provider composition cover the two-wire handoff.

## Task 3 — Shared consumer state and acceptance fixture

**Files** — Add `packages/core/src/connections/selection.ts`, `test/connection-selection.test.mjs`, and `test/support/connection-platform.mjs`. Export shared contracts and the selection controller from the core package root.

- [x] Implement and test the shared selection controller for default and configured capacity, pagination, stale reads, controlled updates during child execution, and disposal. Frameworks use native rendering/wire harnesses rather than a shared cross-framework fixture.

## Task 4 — React adapter

**Files** — Add `packages/react/src/ConnectionSection.tsx`, `packages/react/src/CreateConnectionSection.tsx`, `packages/react/src/connection-types.ts`, and `test/react-connection-configuration.test.mjs`. Update `packages/react/src/index.ts` and the React declaration fixtures under `packages/react/test-types/`.

- [x] Implement and test React consumer/provider/invocation rendering, owner launch and selection update, capacity, optional deletion, callback completion, standalone behavior, and provider-owned single close. Export contracts and verify JSX declarations.

## Task 5 — Vue adapter

**Files** — Add `packages/vue/src/ConnectionSection.vue`, `packages/vue/src/CreateConnectionSection.vue`, `packages/vue/src/connection-types.ts`, and `test/vue-connection-configuration.test.mjs`. Update `packages/vue/src/index.ts` and Vue template fixtures under `packages/vue/test-types/`.

- [x] Implement and test Vue consumer/provider/invocation composition with native Vue rendering, typed slots, lifecycle cleanup, owner launch, selection update, standalone/called modes, and single provider-owned close. Verify Vue declarations.

## Task 6 — Svelte adapter

**Files** — Add `packages/svelte/src/ConnectionSection.svelte`, `packages/svelte/src/CreateConnectionSection.svelte`, `packages/svelte/src/connection-types.ts`, and `packages/svelte/tests/connection-configuration.test.ts`. Update `packages/svelte/src/index.ts` and Svelte template fixtures under `packages/svelte/test-types/`.

- [x] Implement and test Svelte consumer/provider/invocation composition with Svelte 5 snippets and lifecycle handling. Verify consumer owner handoff, standalone/called behavior, provider-owned close, and native type fixtures.

## Task 7 — Angular adapter

**Files** — Add `packages/angular/src/connection-section.component.ts`, `packages/angular/src/create-connection-section.component.ts`, `packages/angular/src/create-connection-section-body.directive.ts`, `packages/angular/src/connection-types.ts`, and `packages/angular/tests/connection-configuration.test.mjs` with a standalone host fixture. Update `packages/angular/src/index.ts`, its runtime test command, and Angular strict template fixtures under `packages/angular/test-types/`.

- [x] Implement and test Angular standalone components, signal inputs, projected typed body directives, lifecycle handling, consumer handoff, and provider-owned single close. Verify strict Angular declarations and package output.

## Task 8 — Core manager invocation session

**Files** — Add `packages/core/src/invocation/types.ts`, `packages/core/src/invocation/session.ts`, and `test/manager-invocation.test.mjs`. Export the invocation APIs and types from `packages/core/src/index.ts`. Reuse the value validators in `packages/core/src/input-validation.ts`.

- [x] Implement and test the framework-independent invocation session, standalone detection, metadata parsing, trusted result/failure completion, terminal callback locking, validation errors, and abort cleanup.

## Task 9 — ManagerInvocationSection adapters

**Files** — Add `ManagerInvocationSection.tsx` in React, `ManagerInvocationSection.vue` in Vue, `ManagerInvocationSection.svelte` in Svelte, and `manager-invocation-section.component.ts` and `manager-invocation-called-body.directive.ts` in Angular. Update the four `src/index.ts` files and their existing type fixtures. Add invocation tests alongside each framework's connection tests.

- [x] Implement all four optional invocation adapters over the core session, with native render mechanisms, lifecycle cleanup, tested standalone/called modes, typed completion contracts, and wrapper/provider single-close composition. Core tests cover metadata failures and explicit structured failure completion.

## Task 10 — Integration docs and verification

**Files** — Update `README.md`, `AGENTS.md`, and `test/package-exports.test.mjs`. Use `styles/configuration.css` only for shared layout rules needed by the adapters.

- [x] Document the protocol, authorization boundary, provider registration, all four framework APIs, optional invocation mode, metadata validation, completion/failure callbacks, stylesheet usage, and single-close composition. Verify package exports, clean install, and root build. Do not commit without user direction.
