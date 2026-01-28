#!/bin/sh

scriptName="${npm_lifecycle_event}"
if [ "${scriptName}" = "test:unit" ]; then
    scriptName="test"
fi

filesToRun=$(node $(dirname $0)/adjust-test-path.js $@)
npm run --prefix test/unit "${scriptName}" -- ${filesToRun}
