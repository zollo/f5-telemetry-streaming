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

const DEFAULTS = {};

/**
 * @typedef {import('@f5-telemetry-tests/common/logger').Logger} Logger
 */

/**
 * Intention is to have a common place to store default test configuration
 * that can be shared across different test suites and cached between imports.
 */
module.exports = {
    /** @returns {Logger} Logger instance */
    getDefaultLogger() {
        return DEFAULTS.logger;
    },

    /** @param {Logger} logger Logger instance to set as a default one */
    setDefaultLogger(logger) {
        DEFAULTS.logger = logger;
    },
    /** @returns {object} mocha library */
    getMochaLibrary() {
        return DEFAULTS.mochaLibrary;
    },
    /** @param {object} mochaLib - Mocha library to set as a default one */
    setMochaLibrary(mochaLib) {
        DEFAULTS.mochaLibrary = mochaLib;
    }
};
