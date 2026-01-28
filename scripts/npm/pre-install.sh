#!/bin/bash

set -e

# npm v6 does not set `npm_command` environment variable on `preinstall`` hook, so we need to check `npm_config_argv`
if [ -z "${npm_command}" ]; then
    echo "npm_command is not set. Trying to check npm_config_argv..."
    if [ -z "${npm_config_argv}" ]; then
        echo "npm_config_argv is not set. Exiting..."
        exit 1
    fi

    npm_command=$(node -e "console.log(JSON.parse(process.env.npm_config_argv).original[0])")
fi

echo "Detected npm_command: ${npm_command}"

if [ "${npm_command}" = "install" ]; then
    $SHELL $(dirname $0)/check-node-runtime.sh "12" "8"
fi
