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
    opt = opt
        .options('version', {
            desc: 'The version of the release. E.g. 2.7.1-rc2',
            demand: true
         })
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('List the apache git repo urls for release artifacts.\n' +
               '\n' +
               'Usage: $0 list-release-urls [-r repos] --version=2.7.1-rc2')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);
    var version = argv['version'];

    var baseUrl = 'http://git-wip-us.apache.org/repos/asf?p=%s.git;a=shortlog;h=refs/tags/%s';
    yield repoutil.forEachRepo(repos, function*(repo) {
        if (!(yield gitutil.tagExists(version))) {
            console.error('Tag "' + version + '" does not exist in repo ' + repo.repoName);
            return;
        }
        var url = require('util').format(baseUrl, repo.repoName, version);
        console.log(url);
        yield executil.execHelper(executil.ARGS('git show-ref ' + version), 2, true);
    });
}

