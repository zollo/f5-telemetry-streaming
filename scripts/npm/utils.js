'use strict';

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

module.exports = {
    /**
     * @returns {string} path to the npm lock file (npm-shrinkwrap.json or package-lock.json)
     * in the current working directory
     */
    lockFilePath() {
        let lockPath = path.resolve(process.cwd(), './npm-shrinkwrap.json');
        if (fs.existsSync(lockPath) === false) {
            lockPath = path.resolve(process.cwd(), './package-lock.json');

            if (!fs.existsSync(lockPath)) {
                console.error('No lock file found (npm-shrinkwrap.json or package-lock.json)');
                process.exit(1);
            }
        }

        return lockPath;
    }
};
