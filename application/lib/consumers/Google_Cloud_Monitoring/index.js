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

const gcpUtil = require('../shared/gcpUtil');
const httpUtil = require('../../utils/http');
const EVENT_TYPES = require('../../constants').EVENT_TYPES;
const requestsUtil = require('../../utils/requests');

const GCM_PROTOCOL = 'https';
const BASE_GCM_URI = 'https://monitoring.googleapis.com/v3/projects';

function checkMetricDescriptors(data, currentPath, metrics) {
    Object.keys(data).forEach((key) => {
        if (key === 'diskStorage') {
            return;
        }
        const path = `${currentPath}/${key}`;
        if (typeof data[key] === 'object') {
            checkMetricDescriptors(data[key], path, metrics);
        }
        if (typeof data[key] === 'number') {
            const metric = {
                key,
                value: data[key],
                path
            };
            metrics.push(metric);
        }
    });
}

const httpAgentsMap = {};

const getHttpAgent = (config) => {
    const agentFromConf = httpUtil.getAgent(config);
    if (!httpAgentsMap[config.id] || httpAgentsMap[config.id].key !== agentFromConf.agentKey) {
        httpAgentsMap[config.id] = {
            key: agentFromConf.agentKey,
            agent: agentFromConf.agent
        };
    }
    return httpAgentsMap[config.id].agent;
};

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    if (context.event.type !== EVENT_TYPES.SYSTEM_POLLER) {
        return Promise.resolve();
    }

    const projectMonitoringUri = `${BASE_GCM_URI}/${context.config.projectId}`;
    const options = {
        agent: getHttpAgent(Object.assign({ connection: { protocol: GCM_PROTOCOL } }, context.config))
    };
    const serviceAccount = {
        serviceEmail: context.config.serviceEmail,
        privateKeyId: context.config.privateKeyId,
        privateKey: context.config.privateKey,
        useServiceAccountToken: context.config.useServiceAccountToken
    };

    return gcpUtil.getAccessToken(serviceAccount, options.agent)
        .then((accessToken) => {
            options.headers = {
                Authorization: `Bearer ${accessToken}`
            };

            // Got a list of MetricDescriptors
            const metrics = [];
            const timeSeries = {
                timeSeries: []
            };

            // Need to get the metrics and see if new descriptors need created
            checkMetricDescriptors(context.event.data.system, '/system', metrics);

            // Build the TimeSeries data
            metrics.forEach((met) => {
                const metric = {
                    type: `custom.googleapis.com${met.path}`
                };
                const points = [
                    {
                        value: {
                            int64Value: met.value
                        },
                        interval: {
                            endTime: {
                                seconds: Math.round(Date.now() / 1000)
                            }
                        }
                    }
                ];

                // Attaches time-series metrics to a 'resource' - label resource as best as we can
                const resource = {};
                if (context.config.reportInstanceMetadata
                    && context.metadata
                    && context.metadata.id
                    && context.metadata.zone) {
                    // Get zone name from full zone string: projects/<id>/zones/<zone>
                    const zone = context.metadata.zone.split('/').pop();
                    resource.type = 'gce_instance';
                    resource.labels = {
                        instance_id: context.metadata.id.toString(),
                        zone
                    };
                } else {
                    resource.type = 'generic_node';
                    resource.labels = {
                        namespace: context.event.data.system.hostname,
                        node_id: context.event.data.system.machineId,
                        location: 'global'
                    };
                }
                timeSeries.timeSeries.push({
                    metric,
                    points,
                    resource,
                    metricKind: 'GAUGE',
                    valueType: 'INT64'
                });
            });

            if (context.tracer) {
                context.tracer.write(timeSeries);
            }

            options.fullURI = `${projectMonitoringUri}/timeSeries`;
            options.body = timeSeries;
            options.method = 'POST';
            return requestsUtil.makeRequest(options);
        })
        .then(() => context.logger.verbose('success'))
        .catch((err) => {
            if (err.message && err.message.indexOf('Bad status code: 401') > -1) {
                gcpUtil.invalidateToken(serviceAccount);
            }
            context.logger.error(`error: ${err.message ? err.message : err}`);
        });
};
