'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Adjust test paths passed as arguments.
 * If a path points to a file inside test/unit/,
 * convert it to a relative path from test/unit/ root.
 *
 * Just a convenience utility to be able to specify test files from
 * project root, instead of using paths relative to test/unit/ folder.
 */

const cwd = process.cwd();
const testUnitPath = path.join(cwd, 'test/unit/');
process.stdout.write(process.argv.slice(2).map((arg) => {
    const tpath = path.resolve(cwd, arg);
    return (fs.existsSync(tpath) && tpath.startsWith(testUnitPath))
        ? tpath.slice(testUnitPath.length)
        : arg;
}).join(' '));
