'use strict';

/* eslint-disable no-console */

const fs = require('fs');

const utils = require('./utils');

/**
 * Patches the the lock file to remove links to internal registry
 */

const LOCK_PATH = utils.lockFilePath();
console.log(`Patching ${LOCK_PATH} to remove internal registry links...`);

const lockData = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));

(function eraseResolvedField(obj) {
    if (typeof obj.resolved === 'string' && obj.resolved.indexOf('f5net') !== -1) {
        obj.resolved = '';
    }

    // eslint-disable-next-line no-unused-vars
    Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
            eraseResolvedField(value);
        }
    });
}(lockData));

fs.writeFileSync(LOCK_PATH, JSON.stringify(lockData, null, 4), 'utf8');
