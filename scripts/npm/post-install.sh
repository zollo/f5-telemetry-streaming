#!/bin/bash

set -e

if [ "${npm_command}" = "install" ] || [ "${npm_lifecycle_event}" = "postdeps:refresh" ]; then
    node $(dirname $0)/lockfile-fix-local-pkgs.js
    node $(dirname $0)/lockfile-remove-urls.js
fi

node $(dirname $0)/lockfile-copy-local-pkgs.js
