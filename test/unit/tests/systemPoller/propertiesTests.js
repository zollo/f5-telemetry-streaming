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

const moduleCache = require('@f5-telemetry-tests/unit-shared/requireCache')();
const assert = require('@f5-telemetry-tests/unit-shared/assert');
const rootDir = require('@f5-telemetry-tests/common/rootdir');
const testUtil = require('@f5-telemetry-tests/unit-shared/util');

const propertiesTestsData = require('./data/propertiesTestsData');

const defaultPaths = rootDir.appImport('lib/paths.json');
const properties = rootDir.appImport('lib/systemPoller/properties');

moduleCache.remember();

describe('System Poller / Properties', () => {
    before(() => {
        moduleCache.restore();
    });

    describe('context properties', () => {
        it('should build context properties', async () => {
            const context = properties.context();
            assert.deepStrictEqual(context.endpoints, defaultPaths.endpoints);
        });
    });

    describe('custom properties', () => {
        it('should fail when empty endpoints passed to the function', async () => {
            assert.throws(() => properties.custom(), 'endpoints should be an object');
            assert.throws(() => properties.custom({}), 'dataActions should be an array');
        });

        it('should be able to process empty endpoints list', async () => {
            assert.deepStrictEqual(
                properties.custom({}, []),
                {
                    endpoints: [],
                    properties: {}
                }
            );
        });

        propertiesTestsData.custom.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => assert.deepStrictEqual(
                properties.custom(testConf.endpoints, testConf.dataActions),
                testConf.expected
            ));
        });
    });

    describe('default properties', () => {
        it('should build default properties (default values)', async () => {
            const props = properties.default({
                contextData: {
                    bashDisabled: false,
                    provisioning: {}
                },
                dataActions: []
            });
            assert.deepStrictEqual(props.endpoints, defaultPaths.endpoints);
            assert.isDefined(props.properties.asmCpuUtilStats);
        });

        it('should ignore TMStats', async () => {
            const props = properties.default({
                contextData: {
                    bashDisabled: true,
                    provisioning: {}
                },
                dataActions: [],
                includeTMStats: false
            });
            assert.deepStrictEqual(props.endpoints, defaultPaths.endpoints);
            assert.isUndefined(props.properties.asmCpuUtilStats);
            assert.isUndefined(props.properties.apmState);
        });

        it('should remove disabled properties TMStats', async () => {
            const props = properties.default({
                contextData: {
                    bashDisabled: true,
                    provisioning: {
                        asm: {
                            level: 'nominal'
                        }
                    }
                },
                dataActions: [],
                includeTMStats: true
            });
            assert.deepStrictEqual(props.endpoints, defaultPaths.endpoints);
            assert.isUndefined(props.properties.asmCpuUtilStats); // bash disabled - removed despite includeTMStats flag
        });

        it('should filter properties based on dataCtions', async () => {
            const props = properties.default({
                contextData: {
                    bashDisabled: true,
                    provisioning: {}
                },
                dataActions: [
                    {
                        excludeData: {},
                        enable: true,
                        locations: {
                            system: true,
                            aaaaPools: true
                        }
                    }
                ],
                includeTMStats: false
            });
            assert.deepStrictEqual(props.endpoints, defaultPaths.endpoints);
            assert.isUndefined(props.properties.asmCpuUtilStats);
            assert.isUndefined(props.properties.system);
            assert.isUndefined(props.properties.aaaaPools);
        });
    });
});
