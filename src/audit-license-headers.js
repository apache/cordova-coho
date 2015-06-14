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
var shelljs = require('shelljs');
var optimist = require('optimist');
var apputil = require('./apputil');
var executil = require('./executil');
var flagutil = require('./flagutil');
var repoutil = require('./repoutil');

var COMMON_RAT_EXCLUDES = [
    '*.wav',
    '*.webloc',
    '*jasmine-1.2.0*',
    'jasmine-2.0.0',
    'topcoat-0.7.5',
    '*.xcodeproj',
    '.*',
    '*-Info.plist',
    'VERSION',
    'node_modules',
    'thirdparty',
    'package.json',
    'component.json',
    '*.xcworkspacedata',
    '*.xccheckout',
    '*.xcscheme',
    ];

module.exports = function*() {
    var opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerHelpFlag(opt);
    opt.usage('Uses Apache RAT to audit source files for license headers.\n' +
              '\n' +
              'Usage: $0 audit-license-headers --repo=name [-r repos]')
    argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r, {includeModules: true});
    // Check that RAT command exists.
    var ratName = 'apache-rat-0.10';
    var ratUrl = "https://dist.apache.org/repos/dist/release/creadur/apache-rat-0.10/apache-rat-0.10-bin.tar.gz";
    var ratPath;
    yield repoutil.forEachRepo([repoutil.getRepoById('coho')], function*() {
        ratPath = path.join(process.cwd(), ratName, ratName+'.jar');
    });
    if (!fs.existsSync(ratPath)) {
        console.log('RAT tool not found, downloading to: ' + ratPath);
        yield repoutil.forEachRepo([repoutil.getRepoById('coho')], function*() {
            if (shelljs.which('curl')) {
                yield executil.execHelper(['sh', '-c', 'curl "' + ratUrl + '" | tar xz']);
            } else {
                yield executil.execHelper(['sh', '-c', 'wget -O - "' + ratUrl + '" | tar xz']);
            }
        });
        if (!fs.existsSync(ratPath)) {
            apputil.fatal('Download failed.');
        }
    }
    console.log(chalk.red('Note: ignore filters exist and often need updating within coho.'));
    console.log(chalk.red('Look at audit-license-headers.js (COMMON_RAT_EXCLUDES) as well as repo.ratExcludes property'));
    yield repoutil.forEachRepo(repos, function*(repo) {
        var allExcludes = COMMON_RAT_EXCLUDES;
        if (repo.ratExcludes) {
            allExcludes = allExcludes.concat(repo.ratExcludes);
        }
        var excludeFlags = [];
        allExcludes.forEach(function(e) {
            excludeFlags.push('-e', e);
        });
        yield executil.execHelper(executil.ARGS('java -jar', ratPath, '-d', '.').concat(excludeFlags));
    });
}

