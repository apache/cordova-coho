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
var path = require('path');
var executil = require('./executil');
var flagutil = require('./flagutil');
var repoutil = require('./repoutil');

module.exports = function*() {
    var opt = flagutil.registerRepoFlag(optimist)
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Performs the supplied shell command in each repo directory.\n' +
               '\n' +
               'Usage: $0 for-each [-r reponame] "shell command"')
        .argv;

    if (argv.h || argv._.length <= 1) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);
    var cmd = [process.env['SHELL'] || 'sh', '-c', argv._[1]];

    yield repoutil.forEachRepo(repos, function*(repo) {
         yield executil.execHelper(cmd, false, true);
    });
}

