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

/* eslint-disable no-console */

const fs = require('fs');

// file to store stats between runs
const STATS_FILE = 'test-stats.json';

function addStats(prev, curr) {
    return (prev || 0) + (curr || 0);
}

function readStatsJSON() {
    if (fs.existsSync(STATS_FILE)) {
        return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
    return {};
}

function saveStatsJSON(data) {
    fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 4), 'utf8');
}

/**
 * Create a Custom Mocha Reporter class
 *
 * @param {Mocha} mocha - mocha module
 * @param {winston.Logger} logger - winston Logger instance
 * @param {object} [reporterOptions] - options
 * @param {boolean} [reporterOptions.enableStatsPersistence=false] - enable stats persistence between runs
 *
 * @returns {Mocha.reporters.Base} Custom Mocha  Reporter class
 */
module.exports = function createCustomMochaReporter(mocha, logger, reporterOptions = {}) {
    const Base = mocha.reporters.Base;
    const color = Base.color;

    // based on mocha.reporters.Spec code
    function CustomMochaReporter(runner, options) {
        Base.call(this, runner, options);

        const self = this;
        let indents = 0;
        let failedTests = 0;
        /**
         * Structure to store info about test execution.
         * Properties:
         *  - title - test title
         *  - attempts - number of attempts
         *  - startTime - time when test started
         *  - endTime - time when test finished (after all retries)
         */
        let currentTest = {};

        function indent() {
            return Array(indents).join('  ');
        }

        runner.on('start', () => {
            console.info();
        });

        runner.on('suite', (suite) => {
            indents += 1;
            console.info(color('suite', '%s%s'), indent(), suite.title);
        });

        runner.on('suite end', () => {
            indents -= 1;
            if (indents === 1) {
                console.info();
            }
        });
        // test pending
        runner.on('pending', (test) => {
            const fmt = indent() + color('pending', '  - %s');
            console.info(fmt, test.title);
        });
        // test start
        runner.on('test', (test) => {
            if (test.title !== currentTest.title) {
                currentTest = {
                    title: test.title,
                    attempts: 0,
                    startTime: Date.now()
                };
            }

            const retryInfo = currentTest.attempts ? ` (${currentTest.attempts} attempt(s) made)` : '';
            logger.info(`${currentTest.attempts ? 'Retrying' : 'Starting'} test - ${currentTest.title}${retryInfo}`);
            currentTest.attempts += 1;
        });

        runner.on('pass', (test) => {
            let fmt = indent() + color('checkmark', `  ${Base.symbols.ok}`) + color('pass', ' %s');
            const fmtArgs = [test.title];
            currentTest.endTime = Date.now();

            if (currentTest.attempts > 1) {
                fmt += color('fail', ' (attempts=%d total_time=%dms last_exec_time=%dms)');
                fmtArgs.push(currentTest.attempts, currentTest.endTime - currentTest.startTime, test.duration);
            } else {
                fmt += color(test.speed, ' (%dms)');
                fmtArgs.push(test.duration);
            }
            currentTest = {};
            fmtArgs.unshift(fmt);
            console.info.apply(console, fmtArgs);
            logger.info(`PASSED: ${test.title}`);
        });

        runner.on('retry', (test, err) => {
            logger.error(`RETRY-ERROR: ${test.title}\n${err.message || err}\n${err.stack}`);
        });

        runner.on('fail', (test) => {
            failedTests += 1;
            currentTest.endTime = Date.now();

            let fmt = indent() + color('fail', '  %d) %s');
            const fmtArgs = [failedTests, test.title];

            if (currentTest.attempts > 1) {
                fmt += color('fail', ' (attempts=%d total_time=%dms last_exec_time=%dms)');
                fmtArgs.push(currentTest.attempts, currentTest.endTime - currentTest.startTime, test.duration);
            } else {
                fmt += color('fail', ' (%dms)');
                fmtArgs.push(test.duration);
            }
            currentTest = {};
            fmtArgs.unshift(fmt);
            console.error.apply(console, fmtArgs);
            logger.info(`FAILED: ${test.title}`);
        });

        runner.once('end', () => {
            self.epilogue();

            if (reporterOptions.enableStatsPersistence !== true) {
                return;
            }

            const prevStats = readStatsJSON();

            ['duration', 'failures', 'passes', 'pending', 'suites', 'tests'].forEach((stat) => {
                prevStats[stat] = addStats(prevStats[stat], self.stats[stat]);
            });

            if (prevStats.start === undefined) {
                prevStats.start = this.stats.start;
            }

            prevStats.end = this.stats.end;
            saveStatsJSON(prevStats);
        });
    }

    mocha.utils.inherits(CustomMochaReporter, Base);

    return CustomMochaReporter;
};

/**
 * @typedef {import('mocha')} Mocha
 */
/**
 * @typedef {import('winston')} Winston
 */
