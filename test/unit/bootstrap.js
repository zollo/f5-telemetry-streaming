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

// import early to cache some pkgs
require('sinon');
require('./logger');
require('@f5-telemetry-tests/unit-shared/assert');
const utRuntime = require('@f5-telemetry-tests/unit-shared/runtime');

// remember initial cache state to restore it later
require('@f5-telemetry-tests/unit-shared/requireCache');

/* eslint-disable no-console */

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
    throw reason;
});

console.log(utRuntime.SMOKE_TESTING_ENABLED ? 'SMOKE TESTING ENABLED' : 'ALL UNIT TESTS');

if (utRuntime.RPM_TESTING_ENABLED) {
    console.log('RPM TESTING ENABLED');
}
