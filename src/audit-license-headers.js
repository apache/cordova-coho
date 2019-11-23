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

var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var optimist = require('optimist');
var executil = require('./executil');
var flagutil = require('./flagutil');
var repoutil = require('./repoutil');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);
const zlib = require('zlib');
const got = require('got');
const tar = require('tar-fs');

// constants
var COMMON_RAT_EXCLUDES = [
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

    // Other
    '.*',
    '*.json', // Excludes all JSON files because commenting is not supported.
    '*.txt', // Excludes all text files because commenting is not supported.
    'VERSION',
    'node_modules',
    'thirdparty'
];

var RAT_IGNORE_PATH = '.ratignore';
var RATIGNORE_COMMENT_PREFIX = '#';

var RAT_NAME = 'apache-rat-0.12';
var RAT_URL = 'https://archive.apache.org/dist/creadur/apache-rat-0.12/apache-rat-0.12-bin.tar.gz';

function startsWith (string, prefix) {
    return string.indexOf(prefix) === 0;
}

function isComment (pattern) {
    return startsWith(pattern.trim(), RATIGNORE_COMMENT_PREFIX);
}

module.exports = function * () {

    var opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerHelpFlag(opt);

    opt.usage('Uses Apache RAT to audit source files for license headers.\n' +
              '\n' +
              'Usage: $0 audit-license-headers --repo=name [-r repos]');
    let argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    var repos = flagutil.computeReposFromFlag(argv.r, { includeModules: true });
    yield module.exports.scrubRepos(repos);
};

module.exports.scrubRepos = function * (repos, silent, ignoreError, win, fail) {
    // Check that RAT command exists.
    var ratPath;
    yield repoutil.forEachRepo([repoutil.getRepoById('coho')], function * () {
        ratPath = path.join(process.cwd(), RAT_NAME, RAT_NAME + '.jar');
    });

    if (!fs.existsSync(ratPath)) {
        console.log('RAT tool not found, downloading to: ' + ratPath);
        yield repoutil.forEachRepo([repoutil.getRepoById('coho')], function * () {
            yield pipeline(
                got.stream(RAT_URL),
                zlib.createGunzip(),
                tar.extract('.')
            ).catch(error => {
                error.message = 'Failed to get RAT binary:\n' + error.message;
                throw error;
            });
        });
    }

    console.log(chalk.red('Note: ignore filters reside in a repo\'s .ratignore and in COMMON_RAT_EXCLUDES in audit-license-headers.js.'));

    // NOTE:
    //      the CWD in a callback is the directory for its respective repo
    yield repoutil.forEachRepo(repos, function * (repo) {
        var excludePatterns = COMMON_RAT_EXCLUDES;

        // read in exclude patterns from repo's .ratignore, one pattern per line
        if (fs.existsSync(RAT_IGNORE_PATH)) {

            var ratignoreFile = fs.readFileSync(RAT_IGNORE_PATH);
            var ratignoreLines = ratignoreFile.toString().trim().split('\n');

            // add only non-empty and non-comment lines
            ratignoreLines.forEach(function (line) {
                if (line.length > 0 && !isComment(line)) {
                    excludePatterns.push(line);
                }
            });
        }

        // run Rat
        const args = executil.ARGS('java -jar', ratPath, '-d', '.', '-e').concat(excludePatterns);
        yield executil.execHelper(args, silent, ignoreError, function (stdout) {
            if (win) win(repo, stdout);
        });
    });
};
