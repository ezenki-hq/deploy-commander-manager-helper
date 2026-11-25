# Dumb Cache reference managers

The two React managers demonstrate a real SDK provider and consumer. Dumb Cache publishes a resource during installation. Dumb Cache Setter obtains a connection from the provider's interface, installs a small companion application on the resource network, and uses that connection to demonstrate a write, a read, and a missing-key read.

## Repository layout

- `examples/apps/dumb-cache` contains the cache Go module, tests, and Dockerfile.
- `examples/apps/dumb-cache-setter` contains the Setter Go module, tests, and Dockerfile. Its `web` directory contains a small React app with its own npm lockfile so this image can build from its application directory.
- `examples/managers/dumb-cache` and `examples/managers/dumb-cache-setter` are private npm workspaces. They use the local core and React SDK packages and import the SDK's generated Tailwind stylesheet. Each has its own manager entry point and official CLI publishing configuration.
- `examples/managers/shared` holds the common cache resource contract and the small amount of shared manager startup and run status code. `examples/README.md` documents local builds and the walkthrough. The repository root contains `build.sh`.

Keeping the two manager interfaces separate from the applications lets a manager run inside Deploy Commander's iframe while the Setter application is served by its own Go process. The frontend and backend of the deployed Setter use the same HTTP origin.

## Application API

Both HTTP servers listen on port `8080`. The cache exposes the following API. The Setter exposes the same two operations at the same relative path and forwards them from Go to the configured cache origin.

| Request | Success |
| --- | --- |
| `PUT /api/value?key=<encoded-key>` with JSON `{"value":"hello"}` | HTTP 204 |
| `GET /api/value?key=<encoded-key>` | HTTP 200 with a JSON string, or JSON `null` if the key is missing |

Keys are nonempty strings. Encode them in the query so spaces, slashes, and other reserved characters round-trip. Empty string values are valid and distinct from missing keys. Reject missing keys, malformed bodies, missing values, and values other than strings with HTTP 400. Reject unsupported methods on the API route. The cache stores values in a mutex-protected map. Neither app adds persistence, authentication, TTL, or other data operations.

Setter requires an HTTP or HTTPS base origin in `CACHE_URL` at startup. It forwards requests with a bounded HTTP timeout and reports cache transport or upstream protocol failures as a gateway error. The React page has key and value inputs, explicit Set and Get buttons, and a result or error area. A missing value displays as the text `null`. Go serves the embedded frontend build and handles the API.

## Manager workflows and trust boundaries

Use the installed Manager Interface RPC and `createCoreActions(wire)`. Use the React SDK's `ConfigurationSection` and status presentation for installation and teardown. Both actions require a click. Show native run status by reading the latest run on mount and reconciling on relevant wire events. Disable conflicting actions while a request is pending or a main-queue run is queued or running. Use a checked, paginated `getRuns` query filtered to queued and running statuses to find active records with no `sub_queue`. A newer named-queue run may appear in history while the main queue is busy. End the wire listener on unmount. The manager starts each run as a single durable operation. Neither manager reads or writes the app's keys.

The cache provider wraps its deployment view and provider view in `ManagerInvocationSection`. Classify called metadata with the SDK guard. For an invalid request, render an error and a button that returns a structured failure through the wrapper's `fail()` callback, without mounting the provider. For a valid request, mount the definition registered under the React `ResourceProviderInterfaces` contract. `CreateConnectionSection` obtains the trusted calling manager and owned resource through the provider wire. Accept only the cache resource type and stable name. The provider validates the owned resource metadata and copies the known application origin to connection metadata as `{ url: "http://dumb-cache:8080" }`. The SDK creates the connection and closes the child once. Standalone use only renders the deployment view.

The Setter manager shows the real SDK `ConnectionSection` filtered by `type: "dumb-cache"` and `external: false`. A user may select an existing connection or invoke the resource owner to create one. The section uses its default capacity of one. On Install, read the exact selected connection with `getConnection()`, compare its ID and owner to the selected ID and current RPC manager, and resolve its resource with the SDK summary `getResource()`. Require an accessible, internal Dumb Cache resource with the expected type and name owned by a different manager. Validate connection metadata against the known cache origin and require the live platform descriptor on the connection detail. Leave descriptor validation and network attachment to the runner. Stop before starting a run if any check or read fails. The only private resource lookup occurs inside `CreateConnectionSection` on the owner wire.

## Runner input

Use `createCoreActions(wire).startRun()`, which sets `ezenki/deploy-commander-runner:latest` and platform `docker`. Install passes `action: "setup"`. Use the SDK's `StartRunConfig` and `RunnerMetadata` types.

| Operation | Required metadata |
| --- | --- |
| Cache install | `services["dumb-cache"]` uses image `ezenki/dumb-cache:latest` and alias `dumb-cache`. Its `resources` array contains `{resource_type: "dumb-cache", name: "dumb-cache", metadata: {url: "http://dumb-cache:8080"}}`. The cache has no published host port or public connection. |
| Setter install | `services["dumb-cache-setter"]` uses image `ezenki/dumb-cache-setter:latest`, `environment: {CACHE_URL: "http://dumb-cache:8080"}`, and `connections: [{type: "Connection", data: {resource: resourceId, connection: connectionId}}]`. Bind container port `8080` to `127.0.0.1` on the Docker host at a configurable port defaulting to `8081`. The walkthrough uses the Docker host or an SSH tunnel for remote access. |
| Either teardown | `{action: "teardown"}` with metadata omitted. The runner owns removal. |

The runner resolves the connection UUID to its live platform network. Deploy both examples on the same Docker daemon so Setter can join the Cache-owned network and resolve the producer's alias. Tear down Setter first so its container releases that network. Setter teardown should remove Setter's deployment while preserving its provider connection for reinstallation. Cache teardown should remove the published resource and its attached connections. These are expected outcomes of the documented runner contract. Verify them against the running image separately from observing a terminal run status. The managers keep state in Deploy Commander and disposable React state.

## Containers and delivery

Use multi-stage Docker builds. Cache compiles Go in its builder stage. Setter builds React with the locked npm dependencies in a Node stage, then compiles Go with that output embedded. Copy only the static Go executable into `gcr.io/distroless/static-debian12:nonroot` for each final image.

The executable repository-root `build.sh` builds both required tags and pushes both to Docker Hub with the configured authentication. Resolve Docker contexts relative to the script and stop on the first error. Both images must build before either push. If the second push fails, report the first push's outcome independently. Manager interface uploads are a separate step through the official CLI and only require credentials for the target Deploy Commander environment.

## Acceptance

- Test both Go modules, including empty values, escaped keys, missing keys, malformed inputs, forwarding, upstream errors, and concurrent cache access. Compile both applications and build both Docker images.
- Test the actual React managers with their SDK components and two connected recording wires. Drive the provider installation, resource selection, owner invocation, creation RPC, single child close, authorized refresh, Setter install, existing selection, and both teardown requests. Assert ownership checks and the exact recorded runner payloads.
- Run the two built images on a local Docker network and verify Set, Get, and missing-key behavior through Setter. Open the Setter page or verify its embedded HTML and assets are served.
- Run the SDK and reference manager checks. Run `./build.sh` and record Docker Hub push results by tag and digest where available.
- Document a live Deploy Commander walkthrough including verification of actual resources, connections, deployments, teardown, and the runner image digest. The user confirmed no live test environment is available for this implementation. Report the live workflow as unverified and distinguish SDK integration tests, local container checks, and Docker Hub publishing results.

## Authoritative contracts

- [Manager Interface Guide](../../integrations/MANAGER_INTERFACE_GUIDE.md)
- [Deployment Runner Implementation Guide](../../integrations/DEPLOYMENT_RUNNER_IMPLEMENTATION_GUIDE.md)
