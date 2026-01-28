# Introduction into Telemetry Streaming Unit Testing

This directory contains all unit tests for the project. This documentation exists to clarify details that might otherwise be ambiguous.

## Reporting

`@f5-telemetry-tests/common/reporter` stores temp information in `$(cwd)/test-stats.json` between runs. It allows to split the entire unit test suite into several runs that helps to mitigate memory usage issues due amount of tests being generated.

## Logging

- Keep console output as clean as possible. Use `console` only for test-related messages (e.g., skipped tests). It is acceptable to use `console` during development.
- Use the `logger` from `logger.js` for all test logs useful for debugging. All logs (including `console` output) are written to `test/artifacts/unit-testoutput.log`.
- Set the `LOG_SECRETS` environment variable to `1` or `true` to allow the logger to write unmasked secrets to the log file.
- Set the `LOG_DST` environment variable to control where Telemetry Streaming (TS) logs (emitted via `application/lib/logger.js`) are written:
  - `console`: logs go to stdout and `test/artifacts/unit-testoutput.log`
  - `file` (default): logs go only to `test/artifacts/unit-testoutput.log`

## Development

NOTE: Before running tests, ensure all packages are installed. Run `npm run install-ci && npm run install-test` from the project root directory.

All unit tests are written using the [mocha](https://mochajs.org) framework, and run using ```npm run test``` during automated or manual test.

Triggered: Every commit pushed to central repository.

Use the template below for new files:

```javascript
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

// restore pristin `require` state
const moduleCache = require('@f5-telemetry-tests/unit-shared/requireCache')();
const assert = require('@f5-telemetry-tests/unit-shared/assert');
const rootDir = require('@f5-telemetry-tests/common/rootdir');

// use rootDir.import to import code from `application` directory
const DataFilter = rootDir.appImport('lib/dataPipeline/dataFilter');

// save modified `require` staet
moduleCache.remember();

describe('Data Filter', () => {
    before(() => {
        // restore  saved`require` state before running tests
        moduleCache.restore();
    });
    // tests ....
});
```

- Create a separate ```*Test.js``` for each source file being tested.
- Use ```sinon``` to mock module's function, property and etc.
- Use ```nock``` to mimic network interaction.
- Use ```assert``` from ```shared/assert.js``` for assertions.
- Avoid ```require``` statements inside of ```describe```, ```before```, ```beforeEach``` and etc. If you are really need it then it will be better to put all your imports along with ```moduleCache = require('@f5-telemetry-tests/unit-shared/requireCache')()``` to before any ```require``` in a file and then invoke ```module.remember()``` after all imports and ```moduleCache.restore()``` (usually in ```before()```) to restore ```require.cache``` state to avoid impact to other tests. This will still allows you to keep ```require.cache``` clean.
- Keep the folder structure flat, this project is not that large or complex.
- Monitor and enforce coverage, but avoid writing tests simply to increase coverage when there is no other perceived value.
- With that being said, **enforce coverage** in automated test.
- When setting up tests with large number of input variations, use testUtil's getCallableDescribe and/or getCallableIt.
  - These support sets of data to check actual and expected results only. If you need some additional check feel free to add additionalproperty or write separate tests.
  - You can specify 'testOpts' property on the same level as 'name'. The following options available:
    - only (bool) - run this test only (it.only)

#### Running individual unit tests

Running the ```npm run test``` command will execute all of the tests in the `./test/unit/` directory (recursively).

However, individual unit tests can be run via mocha, by running the `npm run test-specific` command, along with a custom file glob.

Examples:
* `npm run test-specific -- test/unit/systemPollerTests.js`
* `npm run test-specific -- test/unit/system*`
