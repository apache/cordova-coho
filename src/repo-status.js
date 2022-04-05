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

module.exports = function * (_argv) {
    let opt = flagutil.registerRepoFlag(optimist);
    opt = optimist
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to report on. Can be specified multiple times to specify multiple branches. The local version of the branch is compared with the origin\'s version unless --b2 is specified.'
        })
        .options('branch2', {
            desc: 'The name of the branch to diff against. This is origin/$branch by default.'
        })
        .options('diff', {
            desc: 'Show a diff of the changes.',
            default: false
        });
    opt = flagutil.registerHelpFlag(opt);
    const argv = opt
        .usage('Reports what changes exist locally that are not yet pushed.\n' +
               '\n' +
               'Example usage: $0 repo-status -r auto -b master -b 2.9.x\n' +
               'Example usage: $0 repo-status -r plugins --diff')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    const branches = argv.b && (Array.isArray(argv.b) ? argv.b : [argv.b]);
    const branches2 = branches && argv.branch2 && (Array.isArray(argv.branch2) ? argv.branch2 : [argv.branch2]);
    const repos = flagutil.computeReposFromFlag(argv.r);

    if (branches2 && branches && branches.length !== branches2.length) {
        apputil.fatal('Must specify the same number of --branch and --branch2 flags');
    }

    yield repoutil.forEachRepo(repos, function * (repo) {
        if (repo.svn) {
            print('repo-status not implemented for svn repos');
            return;
        }
        // Determine remote name.
        yield repoupdate.updateRepos([repo], [], true);
        const actualBranches = branches || ['master'];
        for (let i = 0; i < actualBranches.length; ++i) {
            const branchName = actualBranches[i];
            if (!(yield gitutil.localBranchExists(branchName))) {
                continue;
            }
            const targetBranch = branches2 ? branches2[i] : ((yield gitutil.remoteBranchExists(repo, branchName)) ? repo.remoteName + '/' + branchName : 'master');
            const changes = yield executil.execHelper(executil.ARGS('git log --no-merges --oneline ' + targetBranch + '..' + branchName), true);
            if (changes) {
                print('Local commits exist on ' + branchName + ':');
                console.log(changes);
            }
        }
        const gitStatus = yield executil.execHelper(executil.ARGS('git status --short'), true);
        if (gitStatus) {
            print('Uncommitted changes:');
            console.log(gitStatus);
        }
    });
    if (argv.diff) {
        yield repoutil.forEachRepo(repos, function * (repo) {
            const actualBranches = branches || ['master'];
            for (let i = 0; i < actualBranches.length; ++i) {
                const branchName = actualBranches[i];
                if (!(yield gitutil.localBranchExists(branchName))) {
                    return;
                }
                const targetBranch = branches2 ? branches2[i] : ((yield gitutil.remoteBranchExists(repo, branchName)) ? repo.remoteName + '/' + branchName : 'master');
                const diff = yield executil.execHelper(executil.ARGS('git diff ' + targetBranch + '...' + branchName), true);
                if (diff) {
                    print('------------------------------------------------------------------------------');
                    print('Diff for ' + repo.repoName + ' on branch ' + branchName + ' (vs ' + targetBranch + ')');
                    print('------------------------------------------------------------------------------');
                    console.log(diff);
                    console.log('\n');
                }
            }
        });
    }
};
