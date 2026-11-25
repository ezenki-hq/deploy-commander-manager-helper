# Dumb Cache Reference Managers Implementation Plan

> Use Superpowers executing-plans or subagent-driven-development in Luna. Track the tasks and check them against the complete spec before reporting completion.

**Goal** — Build two runnable Go applications and two React managers that demonstrate Deploy Commander resource creation and authorized cross-manager connection use.

**Architecture** — Standalone Go module per image, a React bundle embedded in the Setter image, and two private React manager workspaces consuming the local SDK. Deploy Commander owns resource publication, connection authorization, and runner execution.

**Spec** — [Dumb Cache reference managers](../specs/2026-11-25-dumb-cache-reference-managers-design.md)

## Review focus

- Empty string, escaped keys, and missing keys remain distinct through both HTTP servers and through the Setter page.
- A failed or incompatible cache response is visible as an error. The browser must never mistake it for a missing key.
- A previously selected connection can disappear or point somewhere unexpected before installation. Re-read it and refuse to start a run on a mismatch.
- A native run can already be active when either manager opens, or start from another session. Load and reconcile run state through the documented RPC and events.
- A local image, a registry push, and a successful live teardown each need their own evidence.

## Task 1 — Cache API and image

- [ ] Add `examples/apps/dumb-cache/{go.mod,main.go,main_test.go,Dockerfile,.dockerignore}`. Expose a testable `newHandler() http.Handler`; create each store with its own `sync.RWMutex` and map. Implement GET and PUT on `/api/value` and listen on `:8080`.
- [ ] Write HTTP tests for a missing key yielding JSON `null`, set/read/overwrite with an encoded key, an empty string distinct from missing, empty key, malformed or missing/non-string value, unsupported method, and concurrent reads and writes.
- [ ] Run `go test -race ./...` and `go build ./...` in the cache module. From the repository root, run `docker build -t ezenki/dumb-cache:latest examples/apps/dumb-cache` against the Go builder and distroless runtime stages.

## Task 2 — Setter backend, frontend, and image

- [ ] Add `examples/apps/dumb-cache-setter/{go.mod,main.go,main_test.go,Dockerfile,.dockerignore}` and a standalone Vite/React project under `web` with `package.json`, `package-lock.json`, `index.html`, and `src/main.tsx`. Build to `web/dist` and embed it in Go. Use Go's standard library for HTTP and static serving.
- [ ] Provide `newHandler(cacheOrigin *url.URL, client *http.Client, page fs.FS) http.Handler` or an equivalent testable constructor. Validate the origin at startup. Construct upstream URLs using URL/query encoding. Avoid redirecting to arbitrary upstream origins. Forward PUT and GET with the request context and a bounded client timeout. Translate invalid upstream status or JSON shape to a gateway error, preserve JSON strings and `null`, and serve static files on the same origin.
- [ ] Test with `httptest` using an upstream stub and an injected filesystem. Check forwarded method, escaped key, body, both success statuses, null versus empty string, invalid input, and transport/protocol errors. The React page uses form labels, explicit Set/Get actions, and visible errors and results.
- [ ] From `web`, run `npm ci` and `npm run build`, then run `go test -race ./...` and `go build ./...` from the module. From the repository root, run `docker build -t ezenki/dumb-cache-setter:latest examples/apps/dumb-cache-setter` against the separate Node, Go, and distroless stages.

## Task 3 — Local manager workspaces and provider

- [ ] Add both manager packages to the root workspace configuration and lockfile. Use workspace names and local package versions for SDK core/React. Use Vite relative asset paths (`base: "./"`), typed React entry points, and local SDK CSS. Add each `deploy-commander.json` with a stable manager name, `kind: "pipeline"`, and `buildDirectory: "dist"`. Expose `publish:manager` through the official CLI. Ignore local manager credentials.
- [ ] Create `examples/managers/shared/cache-contract.ts` for the stable name, type, URL and metadata validator, and `shared/run-lifecycle.ts` and startup code for normal wire cleanup and latest-run status. Consume wire events as refresh signals and use `getLastRun` for durable status. Use checked `getRuns` with queued/running filters and pagination to detect any record with no `sub_queue`. Scope state to the active wire and prevent an older read from replacing newer state. Keep admission locked until the run is tracked and expose read/start errors. Use the normal SDK configuration UI as the shared view where practical.
- [ ] Add provider `src/App.tsx` and `src/deployment.ts`. Export a pure `buildCacheInstall(): StartRunConfig`. Implement explicit install and teardown via `createCoreActions`. Compose `ManagerInvocationSection` and `CreateConnectionSection`, classify invocation purpose, and satisfy `ResourceProviderInterfaces`. Invalid metadata shows an action that returns a structured failure via `fail()`. Validate the owned cache resource contract when preparing a connection. Allow the SDK to perform the mutations and terminal child response for the valid path.
- [ ] Add manager tests for standalone mount, no run on load, exact provider setup and teardown payloads, called-mode routing, invalid metadata and unavailable/unowned or unexpected resources, cancellation, and a single owner-side terminal close.

## Task 4 — Setter manager and regression tests

- [ ] Add Setter `src/App.tsx` using the real `ConnectionSection` with the cache type filter and controlled selection. Use a standard `ConfigurationSection` for install/teardown and the loopback host port. Validate integer ports in the range 1–65535. Document where to open the application.
- [ ] Add Setter `src/deployment.ts` with a pure `buildSetterInstall(connectionId: string, resourceId: string, cacheUrl: string, hostPort: number): StartRunConfig` and an orchestration function taking the active wire, selected ID and port. Read the exact connection and resource summary through the SDK and require the trusted current manager to own the connection before invoking `startRun`. Verify the cache metadata, external flag, type, name, cross-manager owner, and presence of a live platform descriptor. Build attachment input with both IDs and let the runner resolve the network.
- [x] Manager contract tests verify the provider and consumer runner payloads, Setter's trusted connection ownership and exact resource summary preflight, descriptor requirement, rejection boundaries, and the SDK's existing two-wire create/return/authorized-refresh workflow. Per user direction, do not create a local test that boots one manager from another. Verify that a newer named-queue run does not hide an active main-queue run. Check both teardown requests. Distinguish modelled runner effects from live observations.
- [ ] Wire strict manager type and Vite builds into the root build after SDK styles exist, and the manager integration suite into root checks. Verify `npm ci` and `npm run build`.

## Task 5 — Build, smoke-test, publish, and document

- [ ] Add executable Bash `build.sh` with `set -euo pipefail`. Resolve its root relative to `BASH_SOURCE[0]`, run both `docker build` commands with their exact `:latest` tags and standalone contexts, then run `docker push` for each tag in the same order. Check syntax and build-before-push/failure behavior.
- [ ] Test the actual images with temporary containers on an isolated local Docker network and the cache alias from the manager contract. Verify the Setter's embedded page and assets, a set/get round trip, and a missing-key response through the Setter endpoint. Remove only smoke-test containers and networks created for the verification.
- [x] Run `./build.sh` with the configured Docker context. Both image builds passed. Docker Hub denied access to `ezenki/dumb-cache:latest`, so fail-fast correctly skipped the Setter push. No push is claimed. Publishing is outside the available Docker Hub permissions.
- [ ] Add `examples/README.md` and a root README link. Include Go and manager build/test commands, `./build.sh`, CLI publishing instructions for the two manager interfaces, Docker host/tunnel access, resource and connection flow, reuse of existing connections, and consumer-before-provider teardown. Describe how to inspect durable run/teardown effects and how to identify the runner image tested.
- [x] Record the live workflow as unverified because no Deploy Commander test environment is available. Include walkthrough steps to run both examples on the same Docker daemon, inspect the resource and selected connection, verify the Setter data round trips, and check Setter teardown followed by cache teardown. Report Docker smoke tests and SDK integration tests separately.
