# Deploy Commander Manager SDK Core Actions Implementation Plan

> Implement in Luna using the Superpowers executing-plans skill. Record progress using the checkboxes and complete verification before reporting the plan done.

**Goal** — Deliver a framework-independent actions factory backed by installer-interface RPC.

**Spec** — [Core actions design](../specs/2026-11-25-core-actions-design.md).

**Source of truth** — Read the [manager interface guide](../../integrations/MANAGER_INTERFACE_GUIDE.md), the [runner implementation guide](../../integrations/DEPLOYMENT_RUNNER_IMPLEMENTATION_GUIDE.md), and the published installer-interface declarations. The checked caller takes named options, preserves server errors, and validates the response; the ordinary caller handles manager lookup and mutations.

## Constraints

- Work in the current checkout and preserve the staged foundation. The previous commit attempt is pending Git author details.
- Keep the dependency in `packages/core/package.json`, update the root lockfile, and leave the framework packages outside the change.
- Use the existing `Wire`, `RPC.SetupCheckedRPCCaller`, and `RPC.SetupRPCCaller`. Test by injecting a scripted wire into the public factory and observing real RPC calls through it.
- Implement and export the TypeScript contract in the spec, including `CoreActions`, the input and result types, and the runner metadata types.

## Task 1 — Resource and run reads

**Files** — `packages/core/{package.json,src/index.ts,src/actions.ts,src/action-types.ts,src/input-validation.ts}`, root `package-lock.json`, and `test/core-actions.test.mjs`.

- [x] Write failing public-factory tests for filtered list reads, checked latest run options and an empty latest page, paginated exact resource matching, an exhausted search, malformed pagination, and owned detail requests. Include an ID that is only a prefix match on page one, a matching ID on page two, and a server cap smaller than the requested limit. Verify the summary scan never calls singular `getResource`.
- [x] Add `@ezenki/deploy-commander-installer-interface@0.8.1` to core. Define `ResourceSummary`, `ResourcePage`, `OwnedResource`, and `LastRunFilters` using the upstream declarations. Add the wire-bound factory and export `CoreActions`, `createCoreActions`, and the public action DTOs through the package root.
- [x] Implement read input validation for IDs, list limits and offsets, boolean and string filters, labels, and supported label selection. Keep optional `getLastRun` filters and preserve the upstream option names. Use the same page traversal for exact resource lookup and later resource connection listing. Use page size 50, item-count offset advancement, and the reported total. Stop the resource scan on a match.
- [x] Verify that checked transport errors, rejected reads, and malformed responses are still distinguishable. Cover missing owned configuration and inconsistent returned IDs. Run the core tests through `npm test`.

## Task 2 — Connection reads and mutations

**Files** — `packages/core/src/{actions,action-types,input-validation,index}.ts` and `test/core-actions.test.mjs`.

- [x] Add failing tests for forwarding connection filters, trusted manager filtering, ownership checks before listing resource connections, all-page collection, detail reads including live descriptors, a server-side existence query, duplicate pair creation, deletion, and invalid input. A resource detail rejection must prevent any connection query. Demonstrate that a supplied manager override cannot replace the trusted current manager. Assert creation and deletion authorization failures propagate from RPC without fallback.
- [x] Define the upstream-backed connection filters, summary, detail, page, and narrowed creation result types. Define `CreateConnectionConfig` with `metadata: JSONValue`, `managerId: string`, `resourceId: string`, `external: boolean`, and optional `labels`. Validate those inputs before the first RPC.
- [x] Implement the seven connection actions from the spec. Call `getManager` for current ownership and validate its result. Call checked singular `getResource` for resource ownership and verify the ID before paging for its connections. Pass the specified owner and resource filters to `connectionExists`, and test both zero and positive totals.
- [x] Preserve raw mutation errors. Call creation with the documented positional arguments and no duplicate check. Call deletion with only the ID. Run `npm test` and inspect the wire assertions.

## Task 3 — Runner start and deployment validation

**Files** — `packages/core/src/{actions,action-types,runner-types,runner-validation,input-validation,index}.ts` and `test/core-runner.test.mjs`.

- [x] Write failing tests for valid setup and teardown, queue byte and character limits, fixed runner and platform, preserved target and payload fields, omission and null/empty handling, and raw start rejection. Add invalid cases for malformed JSON, unsupported metadata keys, missing service images, unknown or cyclic dependencies, invalid or repeated mount paths, invalid bindings and UUID references, empty removal entries, create/remove conflicts, and missing connection or resource IDs on a removal. Assert invalid values cause no wire call and that a removal with both IDs and no optional logical name is valid.
- [x] Define `StartRunConfig` and the guide-backed `RunnerMetadata` and nested types. Use the published run target, label, and JSON value types for the open record fields where applicable. Mirror documented JSON keys for services, service commands, chronjobs, config maps, volumes, removals, connections, redirect, values version, and lifecycle hooks. Preserve valid optional and nullable forms. Read the guide's field-specific restrictions before defining nested types, including the reduced set available to chronjobs and unresolved template values where documented.
- [x] Validate the public options and documented runner invariants from the spec without rebuilding metadata or altering valid values. Keep validation browser-compatible and free of Node-specific runtime APIs. Do not use the SDK for querying live Docker state. Pass explicitly permitted start fields and the fixed runner/platform through the ordinary options-object `start` API. Teardown has no named queue, and metadata is optional. Preserve the ordinary start return type from the upstream caller.
- [x] Run `npm test`. Verify clean installs and run `npm run build`. Check public declaration emission from the core package, including summary versus owned detail, the prohibition on caller-selected manager for `getMyConnections`, and typed start input. Verify with an external strict TypeScript consumer or a temporary compile fixture. Inspect staged and unstaged changes against the entire design and remove any temporary probes.
