'use strict';

/* eslint-disable no-console */

const fs = require('fs');

const utils = require('./utils');

/**
 * Patches the package-lock.json file to use local package paths.
 *
 * npm v8 with option --install-links creates package-lock.json entries
 * with "file:" protocol pointing to local packages.
 *
 * npm v6 has no questions to `packages` section in package-lock.json, but
 * it has some problems with `dependencies` section where it keeps versions
 * like "1.0.0" instead of "file:../packages/pkg-name".
 *
 * This script updates `dependencies` section to point to local packages -
 * it allows npm v6 correctly link local packages during `npm ci`.
 *
 * - For pkgs located outside of the directory with package.json - strip file: prefix
 * - For pkgs located within the directory with package.json - keep file: prefix
 */

const LOCK_PATH = utils.lockFilePath();
console.log(`Patching ${LOCK_PATH} to use local packages...`);

const lockData = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
const localPackages = {};

const nodeModulesPrefix = 'node_modules/';
const filePrefix = 'file:';

Object.entries(lockData.packages).forEach(([pkgName, pkgData]) => {
    if (pkgData.resolved && pkgData.resolved.startsWith(filePrefix)) {
        if (pkgName.startsWith(nodeModulesPrefix)) {
            pkgName = pkgName.slice(nodeModulesPrefix.length);
        }
        localPackages[pkgName] = pkgData.resolved.startsWith(`${filePrefix}..`)
            ? pkgData.resolved.slice(filePrefix.length)
            : pkgData.resolved;
    }
});

if (Object.keys(localPackages).length === 0) {
    console.log('No local packages found in the lock file, no patching needed');
    process.exit(0);
}

console.log('Local packages are:\n', JSON.stringify(localPackages, null, 4));

Object.entries(lockData.dependencies).forEach(([depName, depData]) => {
    if (localPackages[depName]) {
        console.log(`Patching dependency ${depName} version to ${localPackages[depName]}`);
        depData.version = localPackages[depName];
    }
});

fs.writeFileSync(LOCK_PATH, JSON.stringify(lockData, null, 4), 'utf8');
