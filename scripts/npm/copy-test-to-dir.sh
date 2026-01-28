#!/bin/sh

# Copy test directory and all essential files to the target directory

set -e

targetDir="$1"
projectDir="$2"

if [ -z "${targetDir}" ]; then
    echo "Usage: $0 <targetDir> [projectDir]"
    exit 1
fi

if [ -z "${projectDir}" ]; then
    projectDir="$(pwd)"
fi

echo "Copying tests from '${projectDir}' to '${targetDir}'"
echo "Creating destination directory '${targetDir}'"
mkdir -p "${targetDir}"

for fname in "examples" "scripts" "shared" "test" "package.json"; do
    echo "Copying '${fname}' to '${targetDir}/${fname}'"
    cp -r "${projectDir}/${fname}" "${targetDir}/${fname}"
done
