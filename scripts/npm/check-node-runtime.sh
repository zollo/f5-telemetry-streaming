#!/bin/bash

set -e

check_version() {
    node -e "process.exit(Number(!(parseInt(process.argv[1].split('.')[0], 10) < parseInt(process.argv[2], 10))))" "${1}" "${2}"
    return "$?"
}

if check_version $(node -e "console.log(process.versions.node);") "${1}"; then
    echo "ERROR: Node.JS version ${1} and up are required!"
    exit 1
fi
if check_version $(npm --version) "${2}"; then
    echo "ERROR: NPM version ${2} and up are required!"
    exit 1
fi
