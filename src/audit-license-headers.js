/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

const fs = require('node:fs');
const path = require('node:path');
const { styleText } = require('node:util');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const tar = require('tar-fs');
const optimist = require('optimist');
const executil = require('./executil');
const flagutil = require('./flagutil');
const repoutil = require('./repoutil');

const COMMON_RAT_EXCLUDES = [
    // Binary Files
    '*.wav',
    '*.webloc',

    // iOS Related
    '*.xcworkspacedata',
    '*.xccheckout',
    '*.xcscheme',
    '*.xcodeproj',
    '*-Info.plist',
    'Info.plist',

    // exclude code coverage reports
    'lcov-*',
    'lcov.info',

    // Other
    '.*',
    '*.json', // Excludes all JSON files because commenting is not supported.
    '*.txt', // Excludes all text files because commenting is not supported.
    'VERSION',
    'node_modules',
    'thirdparty'
];

module.exports = function * () {
    let opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerHelpFlag(opt);

    opt.usage('Uses Apache RAT to audit source files for license headers.\n' +
              '\n' +
              'Usage: $0 audit-license-headers --repo=name [-r repos]');
    const argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    const repos = flagutil.computeReposFromFlag(argv.r, { includeModules: true });
    yield module.exports.scrubRepos(repos);
};

module.exports.scrubRepos = function * (repos, silent, ignoreError, win, fail) {
    const ratPath = yield getRatJar();

    console.log(styleText(['red'], 'Note: ignore filters reside in a repo\'s .ratignore and in COMMON_RAT_EXCLUDES in audit-license-headers.js.'));

    yield repoutil.forEachRepo(repos, function * (repo) {
        // NOTE: the CWD in a callback is the directory for its respective repo
        const ratignorePatterns = readRatignorePatterns(process.cwd());
        const excludePatterns = COMMON_RAT_EXCLUDES.concat(ratignorePatterns);

        // run Rat
        const args = executil.ARGS('java -jar', ratPath, '-d', '.', '-e').concat(excludePatterns);
        yield executil.execHelper(args, silent, ignoreError, function (stdout) {
            if (win) win(repo, stdout);
        });
    });
};

// Returns path to Apache RAT JAR; downloads it first if necessary
async function getRatJar () {
    const RAT_ID = 'apache-rat-0.12';
    const RAT_URL = `https://archive.apache.org/dist/creadur/${RAT_ID}/${RAT_ID}-bin.tar.gz`;

    const cohoRoot = path.resolve(__dirname, '..');
    const ratJarPath = path.join(cohoRoot, RAT_ID, RAT_ID + '.jar');

    if (!fs.existsSync(ratJarPath)) {
        console.log('RAT tool not found, downloading to: ' + ratJarPath);

        const unzip = new DecompressionStream('gzip');
        await fetch(RAT_URL)
            .then((resp) => resp.body.pipeThrough(unzip))
            .then((stream) => Readable.fromWeb(stream))
            .then((stream) => pipeline(stream, tar.extract(cohoRoot)))
            .catch(err => {
                throw new Error('Failed to get RAT JAR:\n' + err.message);
            });
    }
    return ratJarPath;
}

// Read in exclude patterns from .ratignore at dir
function readRatignorePatterns (dir) {
    const ratignorePath = path.join(dir, '.ratignore');
    if (!fs.existsSync(ratignorePath)) return [];

    // return only non-empty and non-comment lines
    return fs.readFileSync(ratignorePath, 'utf-8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));
}
