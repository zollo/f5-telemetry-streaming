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

/* eslint-disable no-console, prefer-template */

const fs = require('fs');
const path = require('path');

/**
 * @param {Winston} winston - winston module
 * @param {string} dstFile - destination log file
 *
 * @returns {Logger} configured Logger object
 */
module.exports = function createWinstonLogger(winston, dstFile) {
    const LOG_DST = ['console', 'file'].find((item) => item === (process.env.LOG_DST || 'file').trim());
    const LOG_SENSETIVE_INFO = !!['1', 'true'].find((item) => item === process.env.LOG_SECRETS);
    const WINSTON_3 = winston.version && winston.version.startsWith('3.');

    const SECRETS_MASK = '*********';
    const KEYWORDS_TO_MASK = [
        {
            /**
             * single line:
             *
             * { "passphrase": { ...secret... } }
             */
            str: 'passphrase',
            replace: /(\\{0,}["']{0,1}passphrase\\{0,}["']{0,1}\s*:\s*){.*?}/g,
            with: `$1{${SECRETS_MASK}}`
        },
        {
            /**
             * {
             *     "passphrase": "secret"
             * }
             */
            str: 'passphrase',
            replace: /(\\{0,}["']{0,1}passphrase\\{0,}["']{0,1}\s*:\s*)(\\{0,}["']{1}).*?\2/g,
            with: `$1$2${SECRETS_MASK}$2`
        },
        {
            /**
             * {
             *     someSecret: {
             *         cipherText: "secret"
             *     }
             * }
             */
            str: 'cipherText',
            replace: /(\\{0,}["']{0,1}cipherText\\{0,}["']{0,1}\s*:\s*)(\\{0,}["']{1}).*?\2/g,
            with: `$1$2${SECRETS_MASK}$2`
        }
    ];

    // create dir if not exists
    const artifactsDir = path.parse(dstFile);
    if (!fs.existsSync(artifactsDir.dir)) {
        try {
            fs.mkdirSync(artifactsDir.dir);
        } catch (err) {
            if (err.code !== 'EEXIST') {
                throw err;
            }
        }
    }

    if (!WINSTON_3) {
        // using syslog level
        winston.setLevels(winston.config.syslog.levels);
    }

    /**
     * Mask Secrets (as needed)
     *
     * @param {String} msg - message to mask
     *
     * @returns {String} Masked message
     */
    function maskSecrets(msg) {
        if (LOG_SENSETIVE_INFO) {
            return msg;
        }
        let ret = msg;
        // place in try/catch
        try {
            KEYWORDS_TO_MASK.forEach((keyword) => {
                if (msg.indexOf(keyword.str) !== -1) {
                    ret = ret.replace(keyword.replace, keyword.with);
                }
            });
        } catch (e) {
            // just continue
        }
        return ret;
    }

    const loggerOptions = {
        json: false,
        level: 'debug'
    };

    if (WINSTON_3) {
        loggerOptions.format = winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(
                ({
                    timestamp, level, message, ...meta
                }) => `[${timestamp}][${level.toUpperCase()}] `
                    + `${maskSecrets(message || '')}`
                    + `${maskSecrets(meta && Object.keys(meta).length ? ('\n' + JSON.stringify(meta, null, 4)) : '')}`
            )
        );
    } else {
        loggerOptions.timestamp = () => (new Date()).toISOString();
        loggerOptions.formatter = (options) => `[${options.timestamp()}][${options.level.toUpperCase()}] `
            + `${maskSecrets(options.message ? options.message : '')}`
            + `${maskSecrets(options.meta && Object.keys(options.meta).length ? ('\n' + JSON.stringify(options.meta, null, 4)) : '')}`;
    }

    function createLogger(options) {
        if (WINSTON_3) {
            return winston.createLogger(options);
        }
        return new (winston.Logger)(options);
    }

    // json === false to allow custom formatting
    const fileLogger = createLogger({
        levels: winston.config.syslog.levels,
        transports: [
            new (winston.transports.File)({
                name: 'fileOutput',
                filename: dstFile,
                options: {
                    flags: 'w'
                },
                ...(WINSTON_3 ? {} : loggerOptions)
            })
        ],
        ...(WINSTON_3 ? loggerOptions : {})
    });
    let mainLogger = fileLogger;

    if (LOG_DST === 'console') {
        mainLogger = createLogger({
            levels: winston.config.syslog.levels,
            transports: [
                new (winston.transports.Console)({
                    name: 'consoleOutput',
                    ...(WINSTON_3 ? {} : loggerOptions)
                })
            ],
            ...(WINSTON_3 ? loggerOptions : {})
        });
    }

    function hookStream(stream, callback) {
        stream.write = (function (write) {
            return function (string, encoding, fd) {
                write.apply(stream, arguments); // comments this line if you don't want output in the console
                callback(string, encoding, fd);
            };
        }(stream.write));
    }

    /**
     * Instead of overriding all 'console' functions simply writing
     * stdout and stderr to fileLogger
     */
    hookStream(process.stdout, (string) => {
        fileLogger.info(`[STDOUT] ${string.trim()}`);
    });

    hookStream(process.stderr, (string) => {
        fileLogger.error(`[STDERR] ${string.trim()}`);
    });

    console.info(`Writing logs to ${dstFile}`);
    console.info('Hooks to STDOUT and STDERR were applied');
    console.info(`Secrets logging - ${LOG_SENSETIVE_INFO ? 'ENABLED' : 'DISABLED'}`);

    if (LOG_DST === 'file') {
        console.info(`TS logs will be written to ${dstFile}`);
    } else if (LOG_DST === 'console') {
        console.info(`TS logs will be written to stdout and to ${dstFile}`);
    }

    return {
        logger: mainLogger,
        tsLogger: {
            logger: mainLogger,
            levels: {
                finest: 'debug',
                info: 'info',
                severe: 'error',
                warning: 'warning'
            }
        }
    };
};

/**
 * @typedef {import('winston')} Winston
 */
/**
 * @typedef {object} Logger
 * @property {Winston.Logger} logger - winston logger
 * @property {object} tsLogger - winston logger to use to stub TS logger
 * @property {object} levels - logging levels mapping from winston to TS logger
 * @property {string} finest - winston logging level to stub TS's logger 'finest' level
 * @property {string} info - winston logging level to stub TS's logger 'info' level
 * @property {string} severe - winston logging level to stub TS's logger 'severe' level
 * @property {string} warning - winston logging level to stub TS's logger 'warning' level
 */
