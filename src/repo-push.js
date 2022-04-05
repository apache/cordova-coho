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

const optimist = require('optimist');
const apputil = require('./apputil');
const executil = require('./executil');
const flagutil = require('./flagutil');
const gitutil = require('./gitutil');
const repoutil = require('./repoutil');
const repoupdate = require('./repo-update');
const print = apputil.print;

module.exports = function * (argv) {
    let opt = flagutil.registerRepoFlag(optimist)
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to push. Can be specified multiple times to specify multiple branches.',
            default: ['master']
        });
    opt = flagutil.registerHelpFlag(opt);
    argv = opt
        .usage('Pushes changes to the remote repository.\n' +
               '\n' +
               'Usage: $0 repo-push -r auto -b master -b 2.9.x')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    const branches = Array.isArray(argv.b) ? argv.b : [argv.b];
    const repos = flagutil.computeReposFromFlag(argv.r);

    yield repoutil.forEachRepo(repos, function * (repo) {
        // Update first.
        yield repoupdate.updateRepos([repo], branches, false);
        for (let i = 0; i < branches.length; ++i) {
            const branchName = branches[i];
            if (!(yield gitutil.localBranchExists(branchName))) {
                continue;
            }
            const isNewBranch = !(yield gitutil.remoteBranchExists(repo, branchName));

            yield gitutil.gitCheckout(branchName);

            if (isNewBranch) {
                yield executil.execHelper(executil.ARGS('git push --set-upstream ' + repo.remoteName + ' ' + branchName));
            } else {
                const changes = yield executil.execHelper(executil.ARGS('git log --oneline ' + repo.remoteName + '/' + branchName + '..' + branchName), true);
                if (changes) {
                    yield executil.execHelper(executil.ARGS('git push ' + repo.remoteName + ' ' + branchName));
                } else {
                    print(repo.repoName + ' on branch ' + branchName + ': No local commits exist.');
                }
            }
        }
    });
};
