#!/bin/sh

set -e;  # stop on errors

# by default enable smoke testing
export SMOKE_TESTING=${SMOKE_TESTING:-1}

nycStart=
nycCont=
startDate=$(date)
testsDir=./tests

rm -f test-stats.json

if [ "$1" = "coverage" ]; then
    echo "Coverage report will be generated at the end."
    nycStart="nyc --silent"
    nycCont="nyc --silent --no-clean"
    shift
fi

if [ "$#" -ne 0 ]; then
    # run tests as per user request
    npx ${nycStart} mocha $@
else 
    # run tests from the root of tests dir, no recursive
    npx ${nycStart} mocha ${testsDir}/*.js

    for dir in $(ls -d ${testsDir}/*/); do
        echo "Running tests in ${dir}"
        npx ${nycCont} mocha --recursive "${dir}"
    done
fi

if [ -n "${nycStart}" ]; then
    echo "Generating coverage report"
    npx nyc report
fi

cat test-stats.json
