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

describe('Declarations -> Telemetry_Consumer -> Azure_Log_Analytics_V2', () => {
    const basicSchemaTestsValidator = (decl) => shared.validateMinimal(decl);
    let coreStub;

    const minimalServicePrincipalConfig = {
        type: 'Azure_Log_Analytics_V2',
        dcrImmutableId: 'dcr-00000000000000000000000000000000',
        dceURI: 'https://my-dce.ingest.monitor.azure.com',
        streamName: 'Custom-F5Telemetry',
        tenantId: 'tenantId',
        clientId: 'clientId',
        passphrase: {
            cipherText: 'cipherText'
        }
    };

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

    it('should pass minimal declaration with service principal', () => shared.validateMinimal(
        minimalServicePrincipalConfig,
        {
            type: 'Azure_Log_Analytics_V2',
            dcrImmutableId: 'dcr-00000000000000000000000000000000',
            dceURI: 'https://my-dce.ingest.monitor.azure.com',
            streamName: 'Custom-F5Telemetry',
            tenantId: 'tenantId',
            clientId: 'clientId',
            format: 'default',
            useManagedIdentity: false,
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            }
        }
    ));

    it('should pass minimal declaration with managed identity', () => shared.validateMinimal(
        {
            type: 'Azure_Log_Analytics_V2',
            dcrImmutableId: 'dcr-00000000000000000000000000000000',
            dceURI: 'https://my-dce.ingest.monitor.azure.com',
            streamName: 'Custom-F5Telemetry',
            useManagedIdentity: true
        },
        {
            type: 'Azure_Log_Analytics_V2',
            dcrImmutableId: 'dcr-00000000000000000000000000000000',
            dceURI: 'https://my-dce.ingest.monitor.azure.com',
            streamName: 'Custom-F5Telemetry',
            format: 'default',
            useManagedIdentity: true
        }
    ));

    it('should allow full declaration with service principal', () => shared.validateFull(
        {
            type: 'Azure_Log_Analytics_V2',
            dcrImmutableId: 'dcr-00000000000000000000000000000000',
            dceURI: 'https://my-dce.ingest.monitor.azure.com',
            streamName: 'Custom-F5Telemetry',
            tenantId: 'tenantId',
            clientId: 'clientId',
            passphrase: {
                cipherText: 'cipherText'
            },
            useManagedIdentity: false,
            format: 'propertyBased',
            region: 'westus'
        },
        {
            type: 'Azure_Log_Analytics_V2',
            dcrImmutableId: 'dcr-00000000000000000000000000000000',
            dceURI: 'https://my-dce.ingest.monitor.azure.com',
            streamName: 'Custom-F5Telemetry',
            tenantId: 'tenantId',
            clientId: 'clientId',
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            },
            useManagedIdentity: false,
            format: 'propertyBased',
            region: 'westus'
        }
    ));

    it('should not allow passphrase when useManagedIdentity is true', () => assert.isRejected(
        shared.validateFull({
            type: 'Azure_Log_Analytics_V2',
            dcrImmutableId: 'dcr-00000000000000000000000000000000',
            dceURI: 'https://my-dce.ingest.monitor.azure.com',
            streamName: 'Custom-F5Telemetry',
            useManagedIdentity: true,
            passphrase: {
                cipherText: 'secret'
            }
        }),
        /useManagedIdentity\/const.*"allowedValue":false/
    ));

    it('should require tenantId, clientId and passphrase when useManagedIdentity is false', () => assert.isRejected(
        shared.validateFull({
            type: 'Azure_Log_Analytics_V2',
            dcrImmutableId: 'dcr-00000000000000000000000000000000',
            dceURI: 'https://my-dce.ingest.monitor.azure.com',
            streamName: 'Custom-F5Telemetry',
            useManagedIdentity: false
        }),
        /required property/
    ));

    it('should require tenantId, clientId and passphrase when useManagedIdentity is not set', () => assert.isRejected(
        shared.validateFull({
            type: 'Azure_Log_Analytics_V2',
            dcrImmutableId: 'dcr-00000000000000000000000000000000',
            dceURI: 'https://my-dce.ingest.monitor.azure.com',
            streamName: 'Custom-F5Telemetry'
        }),
        /required property/
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        minimalServicePrincipalConfig,
        [
            'dcrImmutableId',
            'dceURI',
            'streamName',
            'tenantId',
            'clientId',
            { property: 'passphrase', requiredTests: true, ignoreOther: true },
            'region',
            {
                property: 'format',
                ignoreOther: true,
                enumTests: {
                    allowed: ['default', 'propertyBased', 'propertyBasedV2'],
                    notAllowed: ['format']
                }
            }
        ],
        { stringLengthTests: true }
    );

    describe('useManagedIdentity === false', () => {
        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'Azure_Log_Analytics_V2',
                dcrImmutableId: 'dcr-00000000000000000000000000000000',
                dceURI: 'https://my-dce.ingest.monitor.azure.com',
                streamName: 'Custom-F5Telemetry',
                useManagedIdentity: false,
                tenantId: 'tenantId',
                clientId: 'clientId',
                passphrase: {
                    cipherText: 'cipherText'
                }
            },
            'passphrase',
            { requiredTests: true }
        );
    });
});
