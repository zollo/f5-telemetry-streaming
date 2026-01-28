'use strict';

/* eslint-disable no-console */

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const utils = require('./utils');

/**
 * npm v8 with option --install-links creates package-lock.json entries
 * with "file:" protocol pointing to local packages. Also it copies local
 * packages to node_modules to ensure that they are available for tests.
 * And also it install dependencies of those local packages too!
 *
 * npm v6 has no such option like --install-links, so local packages are not
 * copied to node_modules. Instead of that, npm v6 uses symlinks to point to
 * local packages from node_modules.
 *
 * This script copies local packages from their original location to
 * node_modules, so tests can use them without issues.
 */

const LOCK_PATH = utils.lockFilePath();
console.log(`Using data from ${LOCK_PATH} to copy local packages...`);

const lockData = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
const prefix = 'file:';

Object.entries(lockData.packages).forEach(([pkgName, pkgData]) => {
    if (pkgData.resolved && pkgData.resolved.startsWith(prefix)) {
        if (fs.lstatSync(pkgName).isSymbolicLink()) {
            const src = pkgData.resolved.slice(prefix.length);

            console.log(`Updating '${pkgName}' to use to local package`);
            console.log(`  Removing the symbolic link "${pkgName}"`);
            fs.unlinkSync(pkgName);

            const pkgJson = path.join(src, 'package.json');
            if (fs.existsSync(pkgJson)) {
                const pkgInfo = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
                if (pkgInfo.files && pkgInfo.files.length > 0) {
                    console.log(`  Package "${src}" has "files" property defined. Using "npm pack" to copy only specified files`);
                    const archiveName = childProcess.execSync(`npm pack "${src}"`, { stdio: 'pipe', encoding: 'utf8' });

                    console.log(`  Created archive "${archiveName.trim()}"`);
                    console.log(`  Extracting archive to "${pkgName}"`);
                    // strip-components 1 to remove the top-level `package` folder inside the archive
                    childProcess.execSync(`mkdir -p ${pkgName} && tar -xzf ${archiveName.trim()} -C ${pkgName} --strip-components 1`, { stdio: 'inherit' });

                    console.log(`  Removing archive "${archiveName.trim()}"`);
                    fs.unlinkSync(archiveName.trim());

                    const pkgModules = path.join(src, 'node_modules');
                    if (fs.existsSync(pkgModules)) {
                        console.log(`  Copying "node_modules" from "${pkgModules}" to "${src}"`);
                        childProcess.execSync(`cp -r ${pkgModules} ${src}`, { stdio: 'inherit' });
                    }
                    return;
                }
            }
            console.log(`  Copying local package from "${src}" to "${pkgName}"`);
            childProcess.execSync(`cp -r ${src} ${pkgName}`, { stdio: 'inherit' });
        }
    }
});
