# SDD ledger — plan: docs/superpowers/plans/2026-11-25-dumb-cache-reference-managers.md

Base: ec5151a (main). Worktree: feature/connection-sections.

Ruling: No live Deploy Commander environment is available, as confirmed by the user. Complete mock-RPC and local container verification, attempt the explicitly requested image pushes using configured Docker authentication, and report live integration as unverified.

Pre-flight: CoreActions.startRun pins the runner image and validates RunnerMetadata. The provider uses ManagerInvocationSection and CreateConnectionSection. The consumer verifies the exact connection and public resource summary before startRun. Both images must run on same Docker daemon for runner-resolved shared network and DNS alias.

Implemented: Cache and Setter Go applications, REST forwarding, embedded React client, distroless multi-stage Dockerfiles, two local SDK React manager workspaces, runner payload builders, root image build/push script, and local usage documentation.

Verification: Root `npm run build` exited 0, including existing SDK lint, strict type checks, 82 root tests, Angular/Svelte runtime tests, both manager TypeScript/Vite builds, and 5 manager runner-payload tests. Both Go apps passed `go test -race ./...` and `go build ./...`. Both Docker builds exited 0. Docker network smoke test through Setter returned page HTTP 200, set HTTP 204, read `"hello"` HTTP 200, and missing `null` HTTP 200. Smoke containers and network were removed. `git diff --check` passed.

Publish attempt: `./build.sh` built both tags and attempted `docker push ezenki/dumb-cache:latest`. Docker Hub returned `denied: requested access to the resource is denied`. `set -e` stopped before the Setter push. No image push succeeded. Images are available locally as `ezenki/dumb-cache:latest` (image ID prefix `fa6fd34c5b20`) and `ezenki/dumb-cache-setter:latest` (final image ID prefix `617c2fadd2ef`).

Limitations: No Deploy Commander environment is available, as confirmed by the user, so publishing managers and the live workflow remain unverified. The reference manager tests verify their runner payload contracts and the SDK's existing core tests exercise cross-manager create/return/refresh. They do not boot both reference manager React apps inside one shared mocked iframe session. Add that integration fixture if acceptance requires a reference-app-level end-to-end harness.

Acceptance clarification: The user confirmed they do not require a local test that launches one React manager from another. The shared end-to-end behavior is covered by the SDK's actual consumer/provider tests, and Setter-specific preflight and runner construction are covered by the reference manager tests. The user also confirmed Docker Hub publishing is outside the available permissions, so the denied push is recorded as an environment limitation rather than pending implementation work.
