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
const sinon = require('sinon');
const testUtil = require('@f5-telemetry-tests/unit-shared/util');

const defaultConsumer = rootDir.appImport('lib/consumers/default');

moduleCache.remember();

describe.skip('Default Consumer', () => {
    const context = {
        event: {},
        config: {},
        tracer: new testUtil.MockTracer(),
        logger: new testUtil.MockLogger()
    };

    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should process event', () => assert.isFulfilled(defaultConsumer(context)));

    it('should reject on missing event', () => {
        sinon.stub(context, 'event').value(null);
        return assert.isRejected(
            defaultConsumer(context),
            /No event to process/
        );
    });

    it('should continue without tracer', () => {
        sinon.stub(context, 'tracer').value(null);
        return assert.isFulfilled(defaultConsumer(context));
    });
});
