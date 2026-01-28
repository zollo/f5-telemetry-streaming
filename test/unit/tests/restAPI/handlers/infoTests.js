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
const stubs = require('@f5-telemetry-tests/unit-shared/stubs');
const utRuntime = require('@f5-telemetry-tests/unit-shared/runtime');

const restAPIUtils = require('../utils');

const packageJson = rootDir.appImport('package.json');
const RESTAPIService = rootDir.appImport('lib/restAPI');
const RestWorker = rootDir.appImport('nodejs/restWorker');
const schemaJson = rootDir.appImport('schema/latest/base_schema.json');

moduleCache.remember();

describe('REST API / "/info" endpoint', () => {
    const inURI = '/info';
    let coreStub;
    let restAPI;
    let restWorker;

    function sendRequest() {
        return restAPIUtils.waitRequestComplete(
            restWorker,
            restAPIUtils.buildRequest.apply(restAPIUtils, arguments)
        );
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = stubs.default.coreStub({ appEvents: true });

        restAPI = new RESTAPIService(restAPIUtils.TELEMETRY_URI_PREFIX);
        restWorker = new RestWorker();

        restAPI.initialize(coreStub.appEvents.appEvents);
        restWorker.initialize(coreStub.appEvents.appEvents);

        await coreStub.startServices();
        await restAPI.start();

        assert.isTrue(restAPI.isRunning());
    });

    afterEach(async () => {
        await coreStub.destroyServices();
        await restAPI.destroy();
        assert.isTrue(restAPI.isDestroyed());

        sinon.restore();
    });

    it('should return info data on GET request (real data)', async () => {
        const restOp = await sendRequest({ path: inURI });

        const pkgInfo = packageJson.version.split('-');
        const schemaInfo = schemaJson.properties.schemaVersion.enum;

        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
        assert.deepStrictEqual(restOp.body, {
            branch: utRuntime.RPM_TESTING_ENABLED ? packageJson.gitbranch : 'gitbranch',
            buildID: utRuntime.RPM_TESTING_ENABLED ? packageJson.githash : 'githash',
            buildTimestamp: utRuntime.RPM_TESTING_ENABLED ? packageJson.buildtimestamp : 'buildtimestamp',
            fullVersion: packageJson.version,
            nodeVersion: process.version,
            release: pkgInfo[1],
            schemaCurrent: schemaInfo[0],
            schemaMinimum: schemaInfo[schemaInfo.length - 1],
            version: pkgInfo[0]
        });
    });
});
