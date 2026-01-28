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

const assert = require('@f5-telemetry-tests/func-shared/assert');
const constants = require('@f5-telemetry-tests/func-shared/constants');
const harnessUtils = require('@f5-telemetry-tests/func-shared/harness');
const miscUtils = require('@f5-telemetry-tests/func-shared/utils/misc');
const rootDir = require('@f5-telemetry-tests/common/rootdir');
const testUtils = require('@f5-telemetry-tests/func-shared/testUtils');

const DEFAULT_UNNAMED_NAMESPACE = rootDir.appImport('lib/constants').DEFAULT_UNNAMED_NAMESPACE;

/**
 * @module test/functional/consumersTests/defaultPullConsumer
 */

// read in example configs
const BASIC_DECL = miscUtils.readJsonFile(constants.DECL.PULL_CONSUMER_BASIC);
const NAMESPACE_DECL = miscUtils.readJsonFile(constants.DECL.PULL_CONSUMER_WITH_NAMESPACE);

/**
 * Tests for DUTs
 */
function test() {
    describe('Consumer Test: Default Pull Consumer', () => {
        const harness = harnessUtils.getDefaultHarness();

        const verifyResponseData = (response, hostname) => {
            const body = response[0];
            const headers = response[1].headers;

            assert.lengthOf(body, 1, 'should have only one element');
            assert.deepStrictEqual(body[0].system.hostname, hostname, 'should match hostname');
            assert.ok(headers['content-type'].includes('application/json'), 'content-type should include application/json type');
        };

        describe('Without namespace', () => {
            const pullConsumerName = 'My_Pull_Consumer';

            describe('Configure TS and generate data', () => {
                testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy(BASIC_DECL));
            });

            describe('System Poller data', () => {
                harness.bigip.forEach((bigip) => it(
                    `should get the Pull Consumer's formatted data - ${bigip.name}`,
                    () => bigip.telemetry.getPullConsumerData(pullConsumerName)
                        .then((response) => verifyResponseData(response, bigip.hostname))
                ));

                harness.bigip.forEach((bigip) => it(
                    `should get the Pull Consumer's formatted data using namespace endpoint - ${bigip.name}`,
                    () => bigip.telemetry
                        .toNamespace(DEFAULT_UNNAMED_NAMESPACE, true)
                        .getPullConsumerData(pullConsumerName)
                        .then((response) => verifyResponseData(response, bigip.hostname))
                ));
            });
        });

        describe('With namespace', () => {
            describe('Configure TS and generate data', () => {
                testUtils.shouldConfigureTS(harness.bigip, () => miscUtils.deepCopy(NAMESPACE_DECL));
            });

            describe('System Poller data', () => {
                const namespace = 'Second_Namespace';
                const pullConsumerName = 'Pull_Consumer';

                harness.bigip.forEach((bigip) => it(
                    `should get the Pull Consumer's formatted data using namespace endpoint - ${bigip.name}`,
                    () => bigip.telemetry
                        .toNamespace(namespace)
                        .getPullConsumerData(pullConsumerName)
                        .then((response) => verifyResponseData(response, bigip.hostname))
                ));
            });
        });
    });
}

module.exports = {
    test
};
