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
var repoutil = require('./repoutil');

module.exports = function * (_argv) {
    var opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerDepthFlag(opt);

    opt = opt.options('remote', {
        desc: 'The name of the remote you want to update. Example: origin',
        default: ['origin']
    });

    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Updates specified git remotes to apache github repos by performing the following command:\n' +
               '    for each specified repo:\n' +
               '        git remote set-url $REMOTE APACHE_GITHUB_URL' +
               '    By default, it will set $REMOTE to origin and APACHE_GITHUB_URL to the corresponding apache github repo' +
               '\n' +
               'Usage: $0 remote-update [--remote remoteName] [-r repos]')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    var remote = argv.remote;
    var repos = flagutil.computeReposFromFlag(argv.r, true);

    // ensure that any missing repos are cloned
    // yield require('./repo-clone').cloneRepos(repos, true, depth);
    yield updateRemote(repos, remote);
};

function * updateRemote (repos, remote) {
    yield repoutil.forEachRepo(repos, function * (repo) {
        // don't update svn repos
        if (repo.svn) {
            return;
        }

        yield executil.execHelper(executil.ARGS('git remote set-url ' + remote + ' https://github.com/apache/' + repo.repoName + '.git'), false, false);
    });
}
module.exports.updateRemote = updateRemote;
