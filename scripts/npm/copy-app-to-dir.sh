#!/bin/sh

# Copy application and all essential files to the target directory

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

targetAppDir="${targetDir}/application"
projectAppDir="${projectDir}/application"

echo "Copying application from '${projectDir}' to '${targetDir}'"
echo "Creating destination directory '${targetAppDir}'"
mkdir -p "${targetAppDir}"

echo "Packing source application '${projectAppDir}'"
archive=$(npm pack "${projectAppDir}")

echo "Extracting application archive '${archive}' to '${targetAppDir}'"
tar -xzf ${archive} -C ${targetAppDir} --strip-components 1

for fname in "opensource" "scripts"; do
    echo "Copying '${fname}' to '${targetDir}/${fname}'"
    cp -r "${projectDir}/${fname}" "${targetDir}/${fname}"
done
for fname in "LICENSE"; do
    echo "Copying '${fname}' to '${targetAppDir}/${fname}'"
    cp -r "${projectDir}/${fname}" "${targetAppDir}/${fname}"
done

echo "Installing application dependencies in '${targetAppDir}'"
npm run ci:install --prefix "${targetAppDir}"