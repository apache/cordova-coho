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

const flagutil = require('./flagutil');
const optimist = require('optimist');
const executil = require('./executil');
const gitutil = require('./gitutil');
const chalk = require('chalk');
const repoutil = require('./repoutil');

module.exports = function * (argv) {
    const opt = flagutil.registerHelpFlag(optimist);
    opt.options('pr', {
        desc: 'PR # that needs to be merged',
        demand: true
    });
    argv = opt
        .usage('Merges the pull request to master\n' +
        '\n' +
        'This command will:\n' +
        '* Update your local master. \n' +
        '* Fetch the PR and create a branch named `pr/pr#`\n' +
        '* Attempt a `--ff-only` merge to master. If this fails then: \n' +
        '    * Perform a rebase of the `pr/pr#` branch. \n' +
        '    * Attempt a `--ff-only` merge to master. \n' +
        '    * On success, it will modify the last commit\'s message to include. `This closes #pr` to ensure the corresponding PR closes on pushing to remote. \n\n' +
        'Usage: $0 merge-pr --pr 111' +
        '(optional) --pull-only   Pulls the change into a branch only, and checks it out. Does not merge it to the master branch.'
        )
        .argv;
    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    const pull_only = argv['pull-only'];
    const localBranch = 'pr/' + argv.pr;
    const currentRepo = repoutil.getRepoById(repoutil.resolveCwdRepo());
    const origin = 'https://github.com/apache/' + currentRepo.repoName;

    function * mergePr () {
        let commitMessage;
        yield executil.execHelper(executil.ARGS('git checkout master'));

        yield executil.execHelper(['git', 'pull', origin, 'master']);
        const commit = yield executil.execHelper(executil.ARGS('git rev-parse HEAD'), /* silent */ true);
        yield executil.execHelper(['git', 'fetch', /* force update */ '-fu', origin,
            'refs/pull/' + argv.pr + '/head:' + localBranch]);

        if (!pull_only) {
            try {
                yield executil.execHelper(executil.ARGS('git merge --ff-only ' + localBranch),
                    /* silent */ true, /* allowError */ true);
                commitMessage = yield executil.execHelper(executil.ARGS('git log --format=%B -n 1 HEAD'), /* silent */ true);
                yield executil.execHelper(['git', 'commit', '--amend', '-m',
                    commitMessage + '\n\n This closes #' + argv.pr]);
            } catch (e) {
                if (e.message.indexOf('fatal: Not possible to fast-forward, aborting.') > 0) {
                    // Let's try to rebase
                    yield executil.execHelper(executil.ARGS('git checkout ' + localBranch));
                    yield executil.execHelper(['git', 'pull', '--rebase', origin, 'master']);
                    yield executil.execHelper(executil.ARGS('git checkout master'));
                    yield executil.execHelper(executil.ARGS('git merge --ff-only ' + localBranch));
                    commitMessage = yield executil.execHelper(executil.ARGS('git log --format=%B -n 1 HEAD'), /* silent */ true);
                    yield executil.execHelper(['git', 'commit', '--amend', '-m',
                        commitMessage + '\n\n This closes #' + argv.pr]);
                } else {
                    throw e;
                }
            }
            console.log();
            const commits = yield executil.execHelper(['git', 'log',
                '--graph',
                '--pretty=format:%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset',
                '--abbrev-commit',
                '--stat',
                commit + '..HEAD'], /* silent */ true);

            if (commits) {
                console.log('---------------');
                console.log('Commits merged:');
                console.log('---------------');
                console.log(commits);
                console.log(chalk.red.bold('Success! Please test, squash, and rebase to meaningful commits before pushing to remote master using: git push origin master'));
            } else {
                console.log(chalk.red.bold('Nothing to merge - Has this already been merged?'));
            }
        }
    }

    yield gitutil.stashAndPop('', mergePr);
    if (pull_only) {
        yield executil.execHelper(executil.ARGS('git checkout ' + localBranch));
    }
};
