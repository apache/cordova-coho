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

var optimist = require('optimist');
var executil = require('./executil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');

module.exports = function*(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Prints out tags & hashes for the given repos. Used in VOTE emails.\n' +
               '\n' +
               'Usage: $0 print-tags -r plugman -r cli')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);

    yield repoutil.forEachRepo(repos, function*(repo) {
        var tag = yield gitutil.findMostRecentTag();
        if (!tag) {
            console.log('    ' + repo.repoName + ': NO TAGS');
            return;
        }
        var ref = yield executil.execHelper(executil.ARGS('git show-ref ' + tag), true);
        console.log('    ' + repo.repoName + ': ' + tag.replace(/^r/, '') + ' (' + ref.slice(0, 10) + ')');
    });
}

