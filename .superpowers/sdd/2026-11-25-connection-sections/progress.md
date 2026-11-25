# SDD ledger — plan: docs/superpowers/plans/2026-11-25-connection-sections.md

Base: main at 0e54836. Worktree: feature/connection-sections.

Ruling: The provider section owns terminal close when mounted under ManagerInvocationSection. The invocation wrapper only selects content and exposes a distinct completion contract for generic manager pages, preventing duplicate completion handlers.

Implementation: Core connection consumer/provider/selection lifecycles and generic manager invocation are implemented. React, Vue, Svelte, and Angular adapters export `ConnectionSection`, `CreateConnectionSection`, and optional `ManagerInvocationSection`. Consumers resolve resource summaries and launch the resource owner's interface; only the provider uses `getMyResource()` and creates through its own caller RPC. Provider completion returns a credential-free result, while the invocation wrapper does not complete on its behalf.

Verification on 2026-11-25: `npm ci` succeeded. `npm run build` succeeded, including lint, strict core and framework type checks, all package builds and styles, 82 root tests, 10 Angular runtime tests, and 11 Svelte runtime tests. `git diff --check` succeeded. The Angular packager reports its existing conflicting `types`/`default` export-condition warnings but completes successfully.

Test harness note: Framework integration tests use native rendering/test harnesses instead of the planned shared cross-framework two-wire fixture. Shared authorization, metadata validation, terminal completion/failure, and cancellation behavior is tested in core; each adapter additionally exercises its framework's consumer/provider or invocation composition and single-close ownership.

The implementation remains in the `feature/connection-sections` worktree at `/home/codex/.codex/worktrees/14f8/workspace`; it has not been merged or committed.
