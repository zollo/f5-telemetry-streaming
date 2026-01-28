/**
 * Copyright 2025 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const { join, resolve } = require('path');

const findPkgRootDir = require('./pkgdir');

const srcRootDir = findPkgRootDir(__dirname, 'f5-telemetry-root-dir');
const utils = {
    /**
     * Load module from project's application directory.
     *
     * @param {string} modulePath - relative path, e.g. lib/config
     *
     * @returns {Object} loaded module
     */
    appImport(modulePath) {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        return utils.import(join('application', modulePath));
    },

    /** @returns {string} absolute path resolved using project's application directory */
    appResolve(_path) {
        return utils.resolve(join('application', _path));
    },

    /**
     * Load module from project's root directory.
     * Main intention is to:
     * - reduce number of explicit usage of imports with relative path
     * - reduce number of eslint warning regarding dynamic or global imports
     *
     * @param {string} modulePath - relative path, e.g. application/lib/config
     *
     * @returns {Object} loaded module
     */
    import(modulePath) {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        return require(require.resolve(join(srcRootDir, modulePath)));
    },

    /** @returns {string} absolute path resolved using project's root directory */
    resolve(_path) {
        return resolve(join(srcRootDir, _path));
    },

    /** @returns {string} project's root directory */
    rootDir() {
        return srcRootDir;
    }
};

module.exports = utils;
