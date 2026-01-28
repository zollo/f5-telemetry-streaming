#!/bin/bash

set -e

if [ "${npm_command}" = "install" ]; then
    node ../../scripts/npm/lockfile-remove-urls.js
fi
