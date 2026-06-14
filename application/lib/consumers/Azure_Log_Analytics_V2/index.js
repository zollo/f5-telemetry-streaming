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

const util = require('../../utils/misc');
const azureUtil = require('../shared/azureUtil');
const promiseUtil = require('../../utils/promise');
const requestsUtil = require('../../utils/requests');
const EVENT_TYPES = require('../../constants').EVENT_TYPES;

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const dcrImmutableId = context.config.dcrImmutableId;
    const dceURI = context.config.dceURI;
    const streamName = context.config.streamName;
    const isPropertyBased = (context.config.format || '').startsWith('propertyBased');

    // Construct the Logs Ingestion API endpoint URL
    const fullURI = dceURI + '/dataCollectionRules/' + dcrImmutableId + '/streams/' + streamName + '?api-version=2023-01-01';

    // for event types other than systemInfo, let's not chunk
    // so simply format according to what the chunking code expects
    if (context.event.type !== EVENT_TYPES.SYSTEM_POLLER) {
        const copyData = JSON.parse(JSON.stringify(context.event.data));
        context.event.data = {};
        context.event.data[context.event.type] = copyData;
    } else if (isPropertyBased
            && context.config.format.endsWith('V2')
            && context.event.data.system && context.event.data.system.asmAttackSignatures
    ) {
        // move 'asmAttackSignatures' to the top level to allow `azureUtil.isConfigItems`
        // to detect it and `azureUtil.transformConfigItems` to transform it
        context.event.data.asmAttackSignatures = context.event.data.system.asmAttackSignatures;
        delete context.event.data.system.asmAttackSignatures;
    }

    return Promise.resolve()
        .then(() => azureUtil.getAccessTokenForIngestionApi(context))
        .then((accessToken) => {
            const promises = [];
            const tracerMsg = [];
            /* There are several pool types: LTM and several DNS.
               Pools and pool members have many-to-many relationship.
               So, pool members of every type should have their own table,
               even though they are not a top key of the data incoming to the consumer. */
            /* allPoolMembers is the object that will contain pool members of all pool types.
               It will be populated while handling the pools
               (pool members are sub objects of pools in the incoming data). */
            const allPoolMembers = {};
            const poolMemberMapping = new azureUtil.ClassPoolToMembersMapping();
            poolMemberMapping.buildPoolMemeberHolder(allPoolMembers);
            // The pool members will be the handled last, when the pools are already processed.
            Object.keys(context.event.data).concat(Object.keys(allPoolMembers)).forEach((type) => {
                let data;
                if (poolMemberMapping.isPoolMembersType(type)) {
                    data = allPoolMembers[type];
                    if (Object.keys(data).length === 0) {
                        return; // do not create an empty pool members table
                    }
                } else {
                    data = context.event.data[type];
                }
                if (typeof data !== 'object') {
                    data = { value: data }; // make data an object
                }

                if (isPropertyBased
                        && azureUtil.isConfigItems(data, type, poolMemberMapping.isPoolMembersType(type))) {
                    data = azureUtil.transformConfigItems(data);
                    // If it is a pool, transfer its pool members to the pool members table of the corresponding type.
                    if (poolMemberMapping.isPoolType(type)) {
                        data.forEach((pool) => {
                            azureUtil.splitMembersFromPools(pool,
                                allPoolMembers[poolMemberMapping.getPoolMembersType(type)]);
                        });
                    }
                } else {
                    data = [data]; // place in array per API spec
                }
                data.forEach((d) => azureUtil.scrubReservedKeys(d));

                const requestOptions = {
                    method: 'POST',
                    fullURI,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + accessToken
                    },
                    body: data,
                    expectedResponseCode: [200, 204],
                    allowSelfSignedCert: context.config.allowSelfSignedCert
                };

                if (context.tracer) {
                    // deep copy and parse body, otherwise it will be stringified again
                    const requestOptionsCopy = util.deepCopy(requestOptions);
                    // redact secrets in Authorization header
                    requestOptionsCopy.headers.Authorization = '*****';
                    tracerMsg.push(requestOptionsCopy);
                }

                promises.push(requestsUtil.makeRequest(requestOptions));
            });

            if (context.tracer) {
                context.tracer.write(tracerMsg);
            }
            return promiseUtil.allSettled(promises);
        })
        .then((results) => {
            promiseUtil.getValues(results); // throws error if found it
            context.logger.verbose('success');
        })
        .catch((error) => {
            context.logger.exception('Unable to forward to Azure Log Analytics V2 consumer.', error);
        });
};
