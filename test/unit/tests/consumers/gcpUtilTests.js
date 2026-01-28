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
const nock = require('nock');
const querystring = require('querystring');
const rootDir = require('@f5-telemetry-tests/common/rootdir');
const sinon = require('sinon');
const testUtil = require('@f5-telemetry-tests/unit-shared/util');

const request = rootDir.appImport('node_modules/@cypress/request');
const gcpUtil = rootDir.appImport('lib/consumers/shared/gcpUtil');
const httpUtil = rootDir.appImport('lib/utils/http');
const jws = rootDir.appImport('node_modules/jws');

moduleCache.remember();

describe('Google Cloud Util Tests', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        testUtil.nockCleanup();
        sinon.restore();
    });

    describe('getAccessToken', () => {
        const accessTokenResponse = {
            access_token: 'hereHaveSomeAccess',
            expires_in: 1000
        };
        let jwsSignStub;

        beforeEach(() => {
            jwsSignStub = sinon.stub(jws, 'sign').returns('somejsonwebtoken');
        });

        it('should get an Access Token from a signed JWT', () => {
            nock('https://oauth2.googleapis.com')
                .post('/token')
                .reply(200, (_, body) => {
                    assert.isTrue(/&assertion=somejsonwebtoken/.test(body));
                    return accessTokenResponse;
                });

            return gcpUtil.getAccessToken(
                {
                    useServiceAccountToken: false, privateKey: 'key', privateKeyId: 'keyId'
                }
            )
                .then((token) => {
                    assert.isTrue(nock.isDone());
                    assert.strictEqual(token, 'hereHaveSomeAccess');
                });
        });

        it('should cache multiple tokens', () => {
            nock('https://oauth2.googleapis.com')
                .post('/token')
                .times(2)
                .reply(200, accessTokenResponse);

            return Promise.all([
                gcpUtil.getAccessToken({ privateKey: 'key', privateKeyId: 'keyId_1' }),
                gcpUtil.getAccessToken({ privateKey: 'key', privateKeyId: 'keyId_2' })
            ])
                .then((tokens) => {
                    assert.isTrue(nock.isDone());
                    assert.strictEqual(jwsSignStub.callCount, 2);
                    assert.deepStrictEqual(tokens, ['hereHaveSomeAccess', 'hereHaveSomeAccess']);
                });
        });

        it('should send only one request for the same tokenId to avoid race condition', () => {
            nock('https://oauth2.googleapis.com')
                .post('/token')
                .times(1)
                .delayBody(500) // 0.5 second delay
                .reply(200, accessTokenResponse);

            return Promise.all([
                gcpUtil.getAccessToken({ privateKey: 'key', privateKeyId: 'keyId_3' }),
                gcpUtil.getAccessToken({ privateKey: 'key', privateKeyId: 'keyId_3' })
            ])
                .then((tokens) => {
                    assert.isTrue(nock.isDone());
                    assert.strictEqual(jwsSignStub.callCount, 1);
                    assert.deepStrictEqual(tokens, ['hereHaveSomeAccess', 'hereHaveSomeAccess']);
                });
        });
    });

    describe('getAccessToken (instance metadata)', () => {
        const accessTokenResponse = {
            access_token: 'hereHaveSomeAccess',
            expires_in: 1000
        };

        const TOKEN_SCOPES = querystring.stringify({
            scopes: [
                'https://www.googleapis.com/auth/monitoring', 'https://www.googleapis.com/auth/logging.write'
            ].join(',')
        });

        it('should get an Access Token from the instance metadata', () => {
            nock('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/abc')
                .get(`/token?${TOKEN_SCOPES}`)
                .reply(200, () => accessTokenResponse);

            return gcpUtil.getAccessToken({ useServiceAccountToken: true, serviceEmail: 'abc' })
                .then((token) => {
                    assert.isTrue(nock.isDone());
                    assert.strictEqual(token, 'hereHaveSomeAccess');
                });
        });

        it('should send only one metadata token request for same serviceEmail to avoid race', () => {
            nock('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/abc2')
                .get(`/token?${TOKEN_SCOPES}`)
                .times(1)
                .delayBody(500) // 0.5 second delay
                .reply(200, accessTokenResponse);

            return Promise.all([
                gcpUtil.getAccessToken({ useServiceAccountToken: true, serviceEmail: 'abc2' }),
                gcpUtil.getAccessToken({ useServiceAccountToken: true, serviceEmail: 'abc2' })
            ])
                .then((tokens) => {
                    assert.isTrue(nock.isDone());
                    assert.deepStrictEqual(tokens, ['hereHaveSomeAccess', 'hereHaveSomeAccess']);
                });
        });

        it('should not fail to get an Access Token when HTTPs agent is provided', () => {
            nock('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/abc4')
                .get(`/token?${TOKEN_SCOPES}`)
                .reply(200, () => accessTokenResponse);

            const httpsAgent = httpUtil.getAgent({ connection: { protocol: 'https' } }).agent;
            assert.deepStrictEqual(httpsAgent.protocol, 'https:', 'should configured HTTPs agent');

            // for some reason nock does not prevent https requests even if http is used in the URL
            // so, need to verify that no agent passed by stubbing the actual function
            const originGet = request.get;
            sinon.stub(request, 'get').callsFake((opts, cb) => {
                assert.isUndefined(opts.agent);
                originGet(opts, cb);
            });

            return gcpUtil.getAccessToken({ useServiceAccountToken: true, serviceEmail: 'abc4' }, httpsAgent)
                .then((token) => {
                    assert.isTrue(nock.isDone());
                    assert.strictEqual(token, 'hereHaveSomeAccess');
                });
        });
    });
});
