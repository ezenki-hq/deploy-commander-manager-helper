# Reference managers

The examples exercise this repository's Manager Helper SDK directly. Install dependencies from the repository root with `npm ci`. Build the SDK and both manager interfaces with `npm run build`. Run manager tests with `npm test --workspace=@ezenki/dumb-cache-manager` and `npm test --workspace=@ezenki/dumb-cache-setter-manager`. Run either Go test suite with `go test -race ./...` from its application folder.

Build and publish both app images with `./build.sh`. Docker authentication must already be configured. The script builds both images before pushing either. It exits at the first failure. A completed push is not proof of a live manager deployment.

Each manager can be built independently using its workspace's `npm run build`. Publish its generated `dist` with `npx @ezenki/deploy-commander-installer-interface publish --config deploy-commander.json` from that manager directory after configuring the official CLI credentials. Publishing manager interfaces is separate from pushing application images.

## Local workflow

1. Install Dumb Cache through its manager. Its runner deployment owns and publishes the `dumb-cache` resource on a private Docker network.
2. Open the Setter manager. Select an existing authorized connection or request one. The Helper SDK opens the provider manager and returns the resulting connection.
3. Install Setter. Its runner plan references both the resource UUID and authorized connection UUID. The runner attaches Setter to the resource network and sets `CACHE_URL=http://dumb-cache:8080`.
4. Reach the app on the Docker host at port 8081, or use an SSH tunnel for a remote host. Enter keys and string values, then Set and Get. Missing keys display `null`.
5. Tear down Setter first. Its connection remains reusable. Tear down Cache second. The runner removes the owned resource and Deploy Commander removes its attached connections as the documented contract specifies.

Deploy both managers on the same Docker daemon so the Setter runner can join the Cache network. Verify run records and resource/connection state in Deploy Commander. A successful run status alone does not verify each teardown side effect. The live manager workflow requires a Deploy Commander environment and has not been verified in this repository environment.
