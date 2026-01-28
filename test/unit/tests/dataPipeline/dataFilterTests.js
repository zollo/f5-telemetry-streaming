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

const DataFilter = rootDir.appImport('lib/dataPipeline/dataFilter');

moduleCache.remember();

describe('Data Filter', () => {
    before(() => {
        moduleCache.restore();
    });

    describe('DataFilter', () => {
        it('should ignore tmstats if consumer is not Splunk legacy', () => {
            const consumerConfig = {
                type: 'Kafka'
            };
            const data = {
                data: {
                    tmstats: {}
                }
            };

            const filter = new DataFilter(consumerConfig);
            const filteredData = filter.apply(data);

            assert.deepStrictEqual(filter.excludeList, { tmstats: true });
            assert.deepStrictEqual(filteredData, { data: {} });
        });

        it('should not ignore tmstats if consumer is Splunk legacy', () => {
            const consumerConfig = {
                type: 'Splunk',
                format: 'legacy'
            };
            const data = {
                data: {
                    tmstats: {}
                }
            };
            const filter = new DataFilter(consumerConfig);
            const filteredData = filter.apply(data);

            assert.isNull(filter.excludeList);
            assert.deepStrictEqual(filteredData, data);
        });
    });
});
