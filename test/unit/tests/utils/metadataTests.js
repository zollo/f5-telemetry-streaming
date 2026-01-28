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

const azureUtil = rootDir.appImport('lib/consumers/shared/azureUtil');
const gcpUtil = rootDir.appImport('lib/consumers/shared/gcpUtil');
const metadataUtil = rootDir.appImport('lib/utils/metadata');

moduleCache.remember();

describe('Metadata Util', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('.getInstanceMetadata', () => {
        const azureMetadata = {
            compute: {
                azEnvironment: 'AZUREPUBLICCLOUD',
                location: 'westus',
                name: 'examplevmname',
                offer: 'Windows',
                osType: 'linux',
                placementGroupId: 'f67c14ab-e92c-408c-ae2d-da15866ec79a',
                plan: {
                    name: 'planName',
                    product: 'planProduct',
                    publisher: 'planPublisher'
                },
                publisher: 'RDFE-Test-Microsoft-Windows-Server-Group',
                resourceGroupName: 'test-rg',
                resourceId: '/subscriptions/8d10da13-8125-4ba9-a717-bf7490507b3d/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachines/examplevmname',
                subscriptionId: '8d10da13-8125-4ba9-a717-bf7490507b3d',
                tags: 'baz:bash;foo:bar',
                version: '15.05.22',
                vmId: '02aab8a4-74ef-476e-8182-f6d2ba4166a6',
                vmScaleSetName: 'crpteste9vflji9',
                vmSize: 'Standard_A3',
                zone: ''
            }
        };

        const googleMetadata = {
            attributes: {},
            cpuPlatform: 'Intel Broadwell',
            description: '',
            hostname: 'myHost.a.project.internal',
            id: 12345678,
            image: 'projects/ubuntu-os-cloud/global/images/ubuntu',
            machineType: 'projects/1234/machineTypes/n1-standard-1',
            maintenanceEvent: 'NONE',
            name: 'myHost',
            tags: [],
            zone: 'projects/1234/zones/us-west1-b'
        };

        it('should return metadata available for applicable consumer (Azure Log Analytics)', () => {
            sinon.stub(azureUtil, 'getInstanceMetadata').resolves(azureMetadata);
            const mockConsumer = {
                config: {
                    type: 'Azure_Log_Analytics'
                }
            };
            return metadataUtil.getInstanceMetadata(mockConsumer)
                .then((metadata) => {
                    assert.deepStrictEqual(metadata, azureMetadata);
                });
        });

        it('should return metadata available for applicable consumer (Google Cloud Monitoring)', () => {
            sinon.stub(gcpUtil, 'getInstanceMetadata').resolves(googleMetadata);
            const mockConsumer = {
                config: {
                    type: 'Google_Cloud_Monitoring'
                }
            };
            return metadataUtil.getInstanceMetadata(mockConsumer)
                .then((metadata) => {
                    assert.deepStrictEqual(metadata, googleMetadata);
                });
        });

        it('should return null and not throw an error if lookup fails', () => {
            sinon.stub(azureUtil, 'getInstanceMetadata').rejects({ message: 'Let\'s say this failed' });
            const mockConsumer = {
                config: {
                    type: 'Azure_Log_Analytics'
                }
            };

            return metadataUtil.getInstanceMetadata(mockConsumer)
                .then((metadata) => {
                    assert.strictEqual(metadata, null);
                });
        });

        it('should return null if lookup returns empty', () => {
            sinon.stub(azureUtil, 'getInstanceMetadata').resolves({});
            const mockConsumer = {
                config: {
                    type: 'Azure_Log_Analytics'
                }
            };

            return metadataUtil.getInstanceMetadata(mockConsumer)
                .then((metadata) => {
                    assert.strictEqual(metadata, null);
                });
        });

        it('should retry once if first lookup fails', () => {
            const apiCallStub = sinon.stub(azureUtil, 'getInstanceMetadata');
            apiCallStub.onCall(0).rejects({ message: 'Let\'s say this failed' });
            apiCallStub.onCall(1).rejects({ message: 'Let\'s say this failed yet again' });
            apiCallStub.onCall(2).resolves(azureMetadata);
            const mockConsumer = {
                config: {
                    type: 'Azure_Log_Analytics'
                }
            };

            return metadataUtil.getInstanceMetadata(mockConsumer)
                .then((metadata) => {
                    assert.strictEqual(apiCallStub.callCount, 2);
                    assert.strictEqual(metadata, null);
                });
        });
    });
});
