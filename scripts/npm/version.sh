#!/bin/bash

# Script bumps version in all npm packages to match the root package.json version

set -evx

# read new version from the root package.json
rootVersion=$(node -e "console.log(require('./package.json').version);")

echo "Root package.json version: ${rootVersion}"

# files to update
files=(
    "./application"
    "./test/functional"
    "./test/unit"
    "./test/packages/common"
    "./test/packages/func-shared"
    "./test/packages/unit-shared"
)

for dir in "${files[@]}"; do
    pushd "${dir}"
    echo "Updating version in $(pwd) to ${rootVersion}"
    npm version --allow-same-version "${rootVersion}"
    popd
done

git add -A .
