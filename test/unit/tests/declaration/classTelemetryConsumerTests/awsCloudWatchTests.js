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
const schemaValidationUtil = require('@f5-telemetry-tests/unit-shared/schemaValidation');
const sinon = require('sinon');

const common = require('../common');
const shared = require('./shared');

moduleCache.remember();

describe('Declarations -> Telemetry_Consumer -> AWS_CloudWatch', () => {
    const basicSchemaTestsValidator = (decl) => shared.validateMinimal(decl);
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = common.stubCoreModules();
        await coreStub.startServices();
    });

    afterEach(async () => {
        await coreStub.destroyServices();
        sinon.restore();
    });

    describe('dataType', () => {
        describe('dataType === logs', () => {
            schemaValidationUtil.generateSchemaBasicTests(
                basicSchemaTestsValidator,
                {
                    type: 'AWS_CloudWatch',
                    dataType: 'logs',
                    region: 'us-east-1',
                    logGroup: 'pine',
                    logStream: 'tree',
                    username: 'username',
                    passphrase: {
                        cipherText: 'sshSecret'
                    },
                    endpointUrl: 'userDefinedUrl'
                },
                [
                    {
                        property: 'dataType',
                        enumTests: {
                            allowed: ['logs'],
                            notAllowed: ['', 'metrics', 'newlyInvented']
                        },
                        ignoreOther: true
                    },
                    {
                        property: 'maxAwsLogBatchSize',
                        ignoreOther: true,
                        numberRangeTests: {
                            minimum: 1,
                            maximum: 10000
                        }
                    },
                    {
                        property: 'region',
                        ignoreOther: true,
                        enumTests: {
                            allowed: shared.AWS_ALLOWED_REGIONS,
                            notAllowed: [
                                'af-south-1-2',
                                'ap-east-1-3'
                            ]
                        }
                    },
                    'logGroup',
                    'logStream',
                    'username',
                    'endpointUrl'
                ],
                { stringLengthTests: true }
            );
        });

        describe('dataType === metric', () => {
            schemaValidationUtil.generateSchemaBasicTests(
                basicSchemaTestsValidator,
                {
                    type: 'AWS_CloudWatch',
                    region: 'us-east-1',
                    dataType: 'metrics',
                    metricNamespace: 'metricNamespace'
                },
                {
                    property: 'dataType',
                    enumTests: {
                        allowed: ['metrics'],
                        notAllowed: ['logs', 'newlyInvented', '', 'null']
                    }
                }
            );
        });
    });

    describe('username and passphrase', () => {
        it('should require passphrase when username is specified', () => assert.isRejected(
            shared.validateMinimal({
                type: 'AWS_CloudWatch',
                dataType: 'metrics',
                region: 'us-east-1',
                username: 'username'
            }),
            /should NOT be valid/
        ));

        it('should require username when passphrase is specified', () => assert.isRejected(
            shared.validateMinimal({
                type: 'AWS_CloudWatch',
                dataType: 'metrics',
                region: 'us-east-1',
                passphrase: {
                    cipherText: 'passphrase'
                }
            }),
            /should NOT be valid/
        ));
    });

    describe('Logs (default)', () => {
        it('should pass minimal declaration', () => shared.validateMinimal(
            {
                type: 'AWS_CloudWatch',
                region: 'us-east-1',
                logGroup: 'logGroup',
                logStream: 'logStream'
            },
            {
                type: 'AWS_CloudWatch',
                region: 'us-east-1',
                logGroup: 'logGroup',
                logStream: 'logStream',
                maxAwsLogBatchSize: 100,
                dataType: 'logs'
            }
        ));

        it('should allow full declaration', () => shared.validateFull(
            {
                type: 'AWS_CloudWatch',
                maxAwsLogBatchSize: 111,
                region: 'us-east-1',
                logGroup: 'logGroup',
                logStream: 'logStream',
                username: 'username',
                passphrase: {
                    cipherText: 'cipherText'
                },
                dataType: 'logs',
                endpointUrl: 'userDefinedUrl'
            },
            {
                type: 'AWS_CloudWatch',
                maxAwsLogBatchSize: 111,
                region: 'us-east-1',
                logGroup: 'logGroup',
                logStream: 'logStream',
                username: 'username',
                passphrase: {
                    class: 'Secret',
                    protected: 'SecureVault',
                    cipherText: '$M$cipherText'
                },
                dataType: 'logs',
                endpointUrl: 'userDefinedUrl'
            }
        ));

        it('should not allow non-log related properties', () => assert.isRejected(
            shared.validateMinimal({
                type: 'AWS_CloudWatch',
                region: 'us-east-1',
                logStream: 'logStreamThingee',
                logGroup: 'logGroupThingee',
                metricNamespace: 'oddOneOut'
            }),
            /should match exactly one schema in oneOf/
        ));

        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'AWS_CloudWatch',
                region: 'us-east-1',
                logGroup: 'logGroup',
                logStream: 'logStream'
            },
            [
                'logGroup',
                'logStream'
            ],
            { requiredTests: true }
        );
    });

    describe('Metrics', () => {
        it('should pass minimal declaration', () => shared.validateMinimal(
            {
                type: 'AWS_CloudWatch',
                region: 'us-east-1',
                dataType: 'metrics',
                metricNamespace: 'metricsThingee'
            },
            {
                type: 'AWS_CloudWatch',
                region: 'us-east-1',
                dataType: 'metrics',
                metricNamespace: 'metricsThingee'
            }
        ));

        it('should allow full declaration', () => shared.validateFull(
            {
                type: 'AWS_CloudWatch',
                region: 'us-east-1',
                dataType: 'metrics',
                metricNamespace: 'metricsThingee',
                username: 'username',
                passphrase: {
                    cipherText: 'cipherText'
                },
                endpointUrl: 'userDefinedUrl'
            },
            {
                type: 'AWS_CloudWatch',
                region: 'us-east-1',
                dataType: 'metrics',
                metricNamespace: 'metricsThingee',
                username: 'username',
                passphrase: {
                    class: 'Secret',
                    protected: 'SecureVault',
                    cipherText: '$M$cipherText'
                },
                endpointUrl: 'userDefinedUrl'
            }
        ));

        it('should not allow non-metrics properties logStream/logGroup', () => assert.isRejected(
            shared.validateMinimal({
                type: 'AWS_CloudWatch',
                dataType: 'metrics',
                region: 'us-east-1',
                metricNamespace: 'metricsThingee',
                logStream: 'extraOne',
                logGroup: 'extraTwo'
            }),
            /should match exactly one schema in oneOf/
        ));

        it('should not allow non-metrics property maxAwsLogBatchSize', () => assert.isRejected(
            shared.validateMinimal({
                type: 'AWS_CloudWatch',
                dataType: 'metrics',
                region: 'us-east-1',
                metricNamespace: 'metricsThingee',
                maxAwsLogBatchSize: 77
            }),
            /should match exactly one schema in oneOf/
        ));

        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'AWS_CloudWatch',
                region: 'us-east-1',
                dataType: 'metrics',
                metricNamespace: 'metricsThingee'
            },
            'metricNamespace',
            { stringLengthTests: true, requiredTests: true }
        );

        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'AWS_CloudWatch',
                region: 'us-east-1',
                dataType: 'metrics',
                metricNamespace: 'metricsThingee',
                endpointUrl: 'userDefinedUrl'
            },
            'endpointUrl',
            { stringLengthTests: true }
        );
    });
});
