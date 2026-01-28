#!/bin/bash

set -e

echo "Cloning OpenTelemetry Protobuf definitions..."

dst=node_modules/@opentelemetry/opentelemetry-proto
rm -rf "${dst}"
mkdir -p "${dst}"

git clone \
    -c advice.detachedHead=false \
    -q \
    --depth=1 \
    --branch=v1.0.0 \
    https://github.com/open-telemetry/opentelemetry-proto.git "${dst}"

rm -rf "${dst}/.git"

if [ "${npm_command}" = "install" ]; then
    node ../../scripts/npm/lockfile-fix-local-pkgs.js
    node ../../scripts/npm/lockfile-remove-urls.js
fi

node ../../scripts/npm/lockfile-copy-local-pkgs.js