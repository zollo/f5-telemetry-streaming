'use strict';

/**
 * This code is processing npm audit data to filter out
 * ignored security vulnerabilities.
 *
 * Process terminates with exit code 0 if no vulnerabilities remain after filtering,
 * otherwise it outputs the filtered audit data and exits with code 1.
 *
 * The ignored vulnerabilities are specified in a JSON file (.npmauditignore)
 * which contains an array of objects with 'id' and 'reason' fields.
 */

/* eslint-disable no-console */

const assert = require('assert');
const fs = require('fs');

const NPM_AUDIT_IGNORE_FILE = './.npmauditignore';

/**
 * @param {string} message - message to log
 *
 * @returns {void} once message logged (or not when disabled)
 */
function logMsg(message) {
    if (logMsg.enabled) {
        console.error(message);
    }
}

/**
 * Process the npm audit report to filter out ignored vulnerabilities.
 *
 * @param {object} auditData - The npm audit report data.
 *
 * @returns {void} once report processed
 */
function processReport(auditData) {
    if (!fs.existsSync(NPM_AUDIT_IGNORE_FILE)) {
        logMsg(`File ${NPM_AUDIT_IGNORE_FILE} not found, no additional processing will be done.`);
        return;
    }

    const ignoredIssues = JSON.parse(fs.readFileSync(NPM_AUDIT_IGNORE_FILE, 'utf8'));
    const issuesMap = {};
    ignoredIssues.forEach((issue) => {
        issuesMap[issue.id] = issue;
    });

    const depsMap = {};

    // first pass: build a map of vulnerabilities and their dependents (O(N))
    Object.values(auditData.vulnerabilities).forEach((vuln) => {
        vuln.via = vuln.via.filter((item) => {
            if (typeof item === 'object' && item.url && issuesMap[item.url]) {
                logMsg(`Ignoring issue: [${vuln.name}] ${item.url} - ${issuesMap[item.url].reason}`);
                return false;
            }
            return true;
        });

        const entry = {
            dependents: {},
            originBlock: vuln,
            shouldIgnore: false
        };

        vuln.via.forEach((item) => {
            if (typeof item === 'object') {
                if (item.name !== vuln.name) {
                    throw new Error(`Unexpected nested vulnerability for ${vuln.name}: ${item.name}`);
                }
            } else {
                entry.dependents[item] = {};
            }
        });

        depsMap[vuln.name] = entry;
    });

    const roots = [];
    // second pass: build a full dependency tree (O(N))
    Object.values(depsMap).forEach((entry) => {
        Object.keys(entry.dependents).forEach((depName) => {
            const depEntry = depsMap[depName];
            assert(depEntry, `Dependent entry for ${depName} not found`);
            entry.dependents[depName] = depEntry;
        });

        if (entry.originBlock.effects.length === 0) {
            roots.push(entry);
        }
    });

    roots.forEach(function adjustEntry(entry) {
        if (entry.shouldIgnore) {
            // already inspected, no need to check one more time
            return;
        }

        Object.entries(entry.dependents).forEach(([depName, depEntry]) => {
            adjustEntry(depEntry);
            if (depEntry.shouldIgnore) {
                delete entry.dependents[depName];
            }
        });

        entry.originBlock.via = entry.originBlock.via.filter((item) => {
            if (typeof item === 'string' && typeof entry.dependents[item] === 'undefined') {
                return false;
            }
            return true;
        });

        if (Object.keys(entry.dependents).length === 0 && entry.originBlock.via.length === 0) {
            delete auditData.vulnerabilities[entry.originBlock.name];
            entry.shouldIgnore = true;
        }
    });

    // forth pass: recalculate vulnerability counts
    const vulnCounts = auditData.metadata.vulnerabilities;
    Object.keys(vulnCounts).forEach((severity) => {
        vulnCounts[severity] = 0;
    });

    Object.values(auditData.vulnerabilities).forEach((vuln) => {
        vulnCounts[vuln.severity] += 1;
        vulnCounts.total += 1;
    });
}

/**
 * @param {objet} auditData - processed npm audit data
 *
 * @returns {void} process terminated with proper exit code
 */
function terminateProcess(auditData) {
    console.log(JSON.stringify(auditData, null, 2));
    process.exit(Number(auditData.metadata.vulnerabilities.total !== 0));
}

/**
 * @returns {Promise<string>} resolved with data read from stdin
 */
function readStdin() {
    return new Promise((resolve, reject) => {
        const inputData = [];
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
            inputData.push(chunk);
        });
        process.stdin.on('end', () => resolve(inputData.join('')));
        process.stdin.on('error', reject);
    });
}

/**
 * Main function to read stdin, process the audit report, and terminate the process.
 *
 * @returns {Promise<void>} once processing is complete
 */
async function main() {
    logMsg.enabled = process.env.npm_config_loglevel !== 'silent';

    const originData = await readStdin();
    const trimmedData = originData.trim();
    if (trimmedData.length === 0) {
        logMsg('No data received from stdin, exiting...');
        process.exit(0);
    }

    let auditReport = null;
    try {
        auditReport = JSON.parse(trimmedData);
    } catch (e) {
        logMsg('Unable to parse data from stdin...');
        console.log(originData);
        process.exit(1);
    }

    if (!(Number.isSafeInteger(auditReport.auditReportVersion) && auditReport.auditReportVersion >= 2)) {
        logMsg('Audit report version is not supported, exiting...');
        console.log(originData);
        process.exit(1);
    }

    processReport(auditReport);
    terminateProcess(auditReport);
}

if (require.main === module) {
    main().catch((err) => {
        logMsg('Error processing npm audit data:', err);
        process.exit(1);
    });
}
