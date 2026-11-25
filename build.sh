#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
docker build -t ezenki/dumb-cache:latest "$ROOT/examples/apps/dumb-cache"
docker build -t ezenki/dumb-cache-setter:latest "$ROOT/examples/apps/dumb-cache-setter"
docker push ezenki/dumb-cache:latest
docker push ezenki/dumb-cache-setter:latest
