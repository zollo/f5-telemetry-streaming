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

const azureLogAnalyticsV2Index = rootDir.appImport('lib/consumers/Azure_Log_Analytics_V2/index');
const azureUtil = rootDir.appImport('lib/consumers/shared/azureUtil');
const requestsUtil = rootDir.appImport('lib/utils/requests');

moduleCache.remember();

describe('Azure_Log_Analytics_V2', () => {
    let requests;

    const DCE_URI = 'https://my-dce.eastus-1.ingest.monitor.azure.com';
    const DCR_IMMUTABLE_ID = 'dcr-00000000000000000000000000000000';
    const STREAM_NAME = 'Custom-F5Telemetry';
    const EXPECTED_FULL_URI = DCE_URI + '/dataCollectionRules/' + DCR_IMMUTABLE_ID + '/streams/' + STREAM_NAME + '?api-version=2023-01-01';
    const ACCESS_TOKEN = 'stubbed-access-token';

    const defaultConsumerConfig = {
        dcrImmutableId: DCR_IMMUTABLE_ID,
        dceURI: DCE_URI,
        streamName: STREAM_NAME,
        tenantId: 'my-tenant-id',
        clientId: 'my-client-id',
        passphrase: 'clientsecret',
        useManagedIdentity: false,
        allowSelfSignedCert: false
    };

    const managedIdentityConsumerConfig = {
        dcrImmutableId: DCR_IMMUTABLE_ID,
        dceURI: DCE_URI,
        streamName: STREAM_NAME,
        useManagedIdentity: true,
        allowSelfSignedCert: false
    };

    const getIngestionReq = () => {
        const req = requests.find((r) => r.fullURI === EXPECTED_FULL_URI);
        assert.notStrictEqual(req, undefined);
        return req;
    };

    const getAllIngestionReqs = () => requests.filter((r) => r.fullURI === EXPECTED_FULL_URI);

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        requests = [];
        sinon.stub(requestsUtil, 'makeRequest').callsFake((opts) => {
            requests.push(opts);
            return Promise.resolve({ statusCode: 200 });
        });
        sinon.stub(azureUtil, 'getAccessTokenForIngestionApi').resolves(ACCESS_TOKEN);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('process', () => {
        it('should use the Logs Ingestion API endpoint', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = { myKey: 'myValue' };

            return azureLogAnalyticsV2Index(context)
                .then(() => {
                    const req = getIngestionReq();
                    assert.strictEqual(req.fullURI, EXPECTED_FULL_URI);
                });
        });

        it('should use ****** authorization', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = { myKey: 'myValue' };

            return azureLogAnalyticsV2Index(context)
                .then(() => {
                    const req = getIngestionReq();
                    assert.deepStrictEqual(req.headers, {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + ACCESS_TOKEN
                    });
                });
        });

        it('should not include Log-Type or x-ms-date headers', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = { myKey: 'myValue' };

            return azureLogAnalyticsV2Index(context)
                .then(() => {
                    const req = getIngestionReq();
                    assert.strictEqual(req.headers['Log-Type'], undefined);
                    assert.strictEqual(req.headers['x-ms-date'], undefined);
                });
        });

        it('should set allowSelfSignedCert from config', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: Object.assign({}, defaultConsumerConfig, { allowSelfSignedCert: true })
            });
            context.event.data = { myKey: 'myValue' };

            return azureLogAnalyticsV2Index(context)
                .then(() => {
                    const req = getIngestionReq();
                    assert.strictEqual(req.allowSelfSignedCert, true);
                });
        });

        it('should call getAccessTokenForIngestionApi with context', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = { myKey: 'myValue' };

            return azureLogAnalyticsV2Index(context)
                .then(() => {
                    assert.strictEqual(azureUtil.getAccessTokenForIngestionApi.calledOnce, true);
                    assert.strictEqual(azureUtil.getAccessTokenForIngestionApi.firstCall.args[0], context);
                });
        });

        it('should call getAccessTokenForIngestionApi when useManagedIdentity is true', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: managedIdentityConsumerConfig
            });
            context.event.data = { myKey: 'myValue' };

            return azureLogAnalyticsV2Index(context)
                .then(() => {
                    assert.strictEqual(azureUtil.getAccessTokenForIngestionApi.calledOnce, true);
                });
        });

        it('should send one request per data type', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = {
                type1: { prop1: 'value1' },
                type2: { prop2: 'value2' }
            };

            return azureLogAnalyticsV2Index(context)
                .then(() => {
                    const reqs = getAllIngestionReqs();
                    assert.strictEqual(reqs.length, 2);
                });
        });

        it('should wrap non-object values', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = { myKey: 'stringValue' };

            return azureLogAnalyticsV2Index(context)
                .then(() => {
                    const req = getIngestionReq();
                    assert.deepStrictEqual(req.body, [{ value: 'stringValue' }]);
                });
        });

        it('should wrap object values in an array', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = { myKey: { nested: 'value' } };

            return azureLogAnalyticsV2Index(context)
                .then(() => {
                    const req = getIngestionReq();
                    assert.deepStrictEqual(req.body, [{ nested: 'value' }]);
                });
        });

        it('should handle non-systemPoller event types', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            context.event.type = 'AVR';
            context.event.data = { AggrInterval: '300', hostname: 'bigip.example.com' };

            return azureLogAnalyticsV2Index(context)
                .then(() => {
                    const req = getIngestionReq();
                    assert.deepStrictEqual(req.body, [{ AggrInterval: '300', hostname: 'bigip.example.com' }]);
                });
        });

        it('should trace data with secrets redacted', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = { myKey: 'myValue' };

            return azureLogAnalyticsV2Index(context)
                .then(() => {
                    const traceData = context.tracer.write.firstCall.args[0];
                    assert.strictEqual(traceData[0].headers.Authorization, '*****');
                });
        });

        it('should log an error and not reject when token retrieval fails', () => {
            azureUtil.getAccessTokenForIngestionApi.restore();
            sinon.stub(azureUtil, 'getAccessTokenForIngestionApi').rejects(new Error('token error'));

            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.event.data = { myKey: 'myValue' };

            return azureLogAnalyticsV2Index(context)
                .then(() => {
                    assert.strictEqual(context.logger.exception.calledOnce, true);
                });
        });
    });

    describe('getAccessTokenForIngestionApi', () => {
        let makeRequestStub;

        before(() => {
            moduleCache.restore();
        });

        beforeEach(() => {
            azureUtil.getAccessTokenForIngestionApi.restore();
            makeRequestStub = requestsUtil.makeRequest;
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should use IMDS token endpoint when useManagedIdentity is true', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: { useManagedIdentity: true, allowSelfSignedCert: false }
            });

            makeRequestStub.callsFake((opts) => {
                if (opts.fullURI && opts.fullURI.includes('169.254.169.254')) {
                    return Promise.resolve({ access_token: 'imds-token' });
                }
                return Promise.resolve({});
            });

            return azureUtil.getAccessTokenForIngestionApi(context)
                .then((token) => {
                    assert.strictEqual(token, 'imds-token');
                    const imdsCall = makeRequestStub.args.find(
                        (args) => args[0].fullURI && args[0].fullURI.includes('169.254.169.254')
                    );
                    assert.ok(imdsCall, 'expected IMDS call');
                    assert.ok(imdsCall[0].fullURI.includes('monitor.azure.com'), 'expected monitor resource');
                });
        });

        it('should use AAD service principal token endpoint when useManagedIdentity is false', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    useManagedIdentity: false,
                    tenantId: 'my-tenant',
                    clientId: 'my-client',
                    passphrase: 'my-secret',
                    allowSelfSignedCert: false
                }
            });

            makeRequestStub.callsFake((opts) => {
                if (opts.fullURI && opts.fullURI.includes('login.microsoftonline.com')) {
                    return Promise.resolve({ access_token: 'sp-token' });
                }
                return Promise.resolve({});
            });

            return azureUtil.getAccessTokenForIngestionApi(context)
                .then((token) => {
                    assert.strictEqual(token, 'sp-token');
                    const spCall = makeRequestStub.args.find(
                        (args) => args[0].fullURI && args[0].fullURI.includes('login.microsoftonline.com')
                    );
                    assert.ok(spCall, 'expected AAD call');
                    assert.ok(spCall[0].fullURI.includes('my-tenant'), 'expected tenant in URL');
                    assert.ok(spCall[0].body.includes('my-client'), 'expected clientId in body');
                    assert.ok(spCall[0].body.includes('my-secret'), 'expected clientSecret in body');
                    assert.strictEqual(spCall[0].headers['Content-Type'], 'application/x-www-form-urlencoded');
                });
        });

        it('should use gov cloud AAD endpoint for gov cloud region', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    useManagedIdentity: false,
                    tenantId: 'my-tenant',
                    clientId: 'my-client',
                    passphrase: 'my-secret',
                    region: 'usgovvirginia',
                    allowSelfSignedCert: false
                }
            });

            makeRequestStub.callsFake((opts) => {
                if (opts.fullURI && opts.fullURI.includes('login.microsoftonline.us')) {
                    return Promise.resolve({ access_token: 'gov-sp-token' });
                }
                return Promise.resolve({});
            });

            return azureUtil.getAccessTokenForIngestionApi(context)
                .then((token) => {
                    assert.strictEqual(token, 'gov-sp-token');
                    const spCall = makeRequestStub.args.find(
                        (args) => args[0].fullURI && args[0].fullURI.includes('login.microsoftonline.us')
                    );
                    assert.ok(spCall, 'expected gov cloud AAD call');
                    assert.ok(spCall[0].body.includes('monitor.azure.us'), 'expected gov monitor resource');
                });
        });

        it('should use gov cloud IMDS resource for gov cloud region when using MSI', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: {
                    useManagedIdentity: true,
                    region: 'usgovvirginia',
                    allowSelfSignedCert: false
                }
            });

            makeRequestStub.callsFake((opts) => {
                if (opts.fullURI && opts.fullURI.includes('169.254.169.254')) {
                    return Promise.resolve({ access_token: 'gov-msi-token' });
                }
                return Promise.resolve({});
            });

            return azureUtil.getAccessTokenForIngestionApi(context)
                .then((token) => {
                    assert.strictEqual(token, 'gov-msi-token');
                    const imdsCall = makeRequestStub.args.find(
                        (args) => args[0].fullURI && args[0].fullURI.includes('169.254.169.254')
                    );
                    assert.ok(imdsCall, 'expected IMDS call');
                    assert.ok(imdsCall[0].fullURI.includes('monitor.azure.us'), 'expected gov monitor resource');
                });
        });
    });
});
