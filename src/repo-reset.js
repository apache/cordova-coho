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
var apputil = require('./apputil');
var executil = require('./executil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');
var repoupdate = require('./repo-update');
var print = apputil.print;

module.exports = function*(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    var opt = optimist
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to reset. Can be specified multiple times to specify multiple branches.',
            default: 'master'
         });
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Resets repository branches to match their upstream state.\n' +
               'Performs the following commands on each:\n' +
               '    git commit                             (commit any pending changes)\n' +
               '    git reset --hard origin/$BRANCH_NAME   (revert un-pushed commits)\n' +
               '    if ($BRANCH_NAME exists only locally) then\n' +
               '        git branch -D $BRANCH_NAME\n' +
               '\n' +
               'Usage: $0 repo-reset -r auto -b master -b 2.9.x')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    if (argv.r == 'auto') {
        apputil.fatal('"-r auto" is not allowed for repo-reset. Please enumerate repos explicitly');
    }
    var branches = Array.isArray(argv.b) ? argv.b : [argv.b];
    var repos = flagutil.computeReposFromFlag(argv.r);

    function *cleanRepo(repo) {
        for (var i = 0; i < branches.length; ++i) {
            var branchName = branches[i];
            if (!(yield gitutil.localBranchExists(branchName))) {
                continue;
            }
            // Commit local changes so that they can be restored if this was a mistake.
            if (yield gitutil.pendingChangesExist()) {
                print('Committing changes just in case resetting was a mistake.');
                yield executil.execHelper(executil.ARGS('git add --all .'));
                yield executil.execHelper(executil.ARGS('git commit -m', 'Automatically committed by coho repo-reset'));
            }

            if (yield gitutil.remoteBranchExists(repo, branchName)) {
                yield gitutil.gitCheckout(branchName);
                var changes = yield executil.execHelper(executil.ARGS('git log --oneline ' + repo.remoteName + '/' + branchName + '..' + branchName));
                if (changes) {
                    print(repo.repoName + ' on branch ' + branchName + ': Local commits exist. Resetting.');
                    yield executil.execHelper(executil.ARGS('git reset --hard ' + repo.remoteName + '/' + branchName));
                } else {
                    print(repo.repoName + ' on branch ' + branchName + ': No local commits to reset.');
                }
            } else {
                if ((yield gitutil.retrieveCurrentBranchName()) == branchName) {
                    yield gitutil.gitCheckout('master');
                }
                print(repo.repoName + ' deleting local-only branch ' + branchName + '.');
                yield executil.execHelper(executil.ARGS('git log --oneline -3 ' + branchName));
                yield executil.execHelper(executil.ARGS('git branch -D ' + branchName));
            }
        }
    }
    yield repoutil.forEachRepo(repos, function*(repo) {
        // Determine remote name.
        yield repoupdate.updateRepos([repo], [], true);
        var branchName = yield gitutil.retrieveCurrentBranchName();
        if (branches.indexOf(branchName) == -1) {
            yield gitutil.stashAndPop(repo, function*() {
                yield cleanRepo(repo);
            });
        } else {
            yield cleanRepo(repo);
        }
    });
}

