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
var print = apputil.print;

module.exports = function * (_argv) {
    var opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerDepthFlag(opt);
    opt = flagutil.registerSshFlag(opt);
    opt = opt
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to update. Can be specified multiple times to update multiple branches.',
            default: ['master']
        })
        .options('fetch', {
            type: 'boolean',
            desc: 'Use --no-fetch to skip the "git fetch" step.',
            default: true
        });
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Updates git repositories by performing the following commands:\n' +
               '    save active branch\n' +
               '    git fetch $REMOTE \n' +
               '    git stash\n' +
               '    for each specified branch:\n' +
               '        git checkout $BRANCH\n' +
               '        git rebase $REMOTE/$BRANCH\n' +
               '        git checkout -\n' +
               '    git checkout $SAVED_ACTIVE_BRANCH\n' +
               '    git stash pop\n' +
               '\n' +
               'Usage: $0 repo-update [--depth 10] [-b branch] [--no-fetch] [-r repos]')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    var depth = argv.depth ? argv.depth : null;

    var branches = Array.isArray(argv.b) ? argv.b : [argv.b];
    var repos = flagutil.computeReposFromFlag(argv.r, true);
    apputil.prefixLength = Math.max.apply(null,
        [apputil.prefixLength].concat(
            repos.map(function (r) { return r.repoName.length + 2; }))
    );

    var useSsh = !!argv.ssh;

    // ensure that any missing repos are cloned
    yield require('./repo-clone').cloneRepos(repos, true, depth, useSsh);
    yield updateRepos(repos, branches, !argv.fetch);
};

function * updateRepos (repos, branches, noFetch) {
    // Pre-fetch checks.
    yield repoutil.forEachRepo(repos, function * (repo) {
        if (repo.svn) {
            return;
        }
        // Ensure it's on a named branch.
        yield gitutil.retrieveCurrentBranchName();
        // Find the apache remote.
        if (!repo.remoteName) {
            repo.remoteName = yield determineApacheRemote(repo);
        }
    });

    if (!noFetch) {
        var fetchPromises = [];
        yield repoutil.forEachRepo(repos, function * (repo) {
            if (repo.svn) {
                return;
            }
            // Note: this does the same as git fetch --tags origin && git fetch origin
            fetchPromises.push(executil.execHelper(executil.ARGS('git remote update ', repo.remoteName), 3));
        });
        if (fetchPromises.length > 1) {
            print('Waiting for concurrent fetches to finish...');
        }
        yield fetchPromises;
    }

    if (branches && branches.length) {
        var errors = '';
        yield repoutil.forEachRepo(repos, function * (repo) {
            if (repo.svn) {
                try {
                    yield executil.execHelper(executil.ARGS('svn up'), /* silent */ false, /* allowError */ true);
                } catch (e) {
                    errors += '(' + repo.repoName + '): ' + e + '\n';
                    // Log failure and continue updating other repos
                    console.log(e);
                }
                return;
            }
            var staleBranches = {};
            for (var i = 0; i < branches.length; ++i) {
                var branchName = branches[i];
                if (yield gitutil.localBranchExists(branchName)) {
                    if (yield gitutil.remoteBranchExists(repo, branchName)) {
                        var changes = yield executil.execHelper(executil.ARGS('git log --oneline ' + branchName + '..' + repo.remoteName + '/' + branchName),
                            /* silent */ true, /* allowError */ true);
                        staleBranches[branchName] = !!changes;
                    }
                } else {
                    yield executil.execHelper(executil.ARGS('git checkout -b ' + branchName + ' remotes/' + repo.remoteName + '/' + branchName),
                        /* silent */ true, /* allowError */ false);
                }
            }
            staleBranches = branches.filter(function (branchName) {
                return !!staleBranches[branchName];
            });
            if (!staleBranches.length) {
                print('Already up-to-date: ' + repo.repoName);
            } else {
                yield gitutil.stashAndPop(repo, function * () {
                    for (var i = 0; i < staleBranches.length; ++i) {
                        var branchName = staleBranches[i];
                        yield gitutil.gitCheckout(branchName);
                        try {
                            var ret = yield executil.execHelper(executil.ARGS('git merge --ff-only', repo.remoteName + '/' + branchName),
                                /* silent */ false, /* allowError */ true);
                            if (ret === null) {
                                try {
                                    ret = yield executil.execHelper(executil.ARGS('git rebase ' + repo.remoteName + '/' + branchName),
                                        /* silent */ false, /* allowError */ true);
                                } catch (ret) {
                                    apputil.fatal('\n\nUpdate failed. Run again with --no-fetch to try again without re-fetching.');
                                }
                            }
                        } catch (e) {
                            errors += '(' + repo.repoName + '): ' + e + '\n';
                            // Log failure and continue updating other repos
                            console.log(e);
                        }
                    }
                });
            }
        });
        if (errors) {
            console.log('ERRORS:');
            console.log(errors);
        }
    }
}
module.exports.updateRepos = updateRepos;

function * determineApacheRemote (repo) {
    var fields = (yield executil.execHelper(executil.ARGS('git remote -v'), true)).split(/\s+/);

    var ret = null;

    // prefer github - in particular, ASF remote does not respond well to repo-update command.
    [
        'git@github.com:apache/',
        'github.com/apache/',
        'git-wip-us.apache.org/repos/asf/',
        'git.apache.org/'
    ].forEach(function (validRepo) {
        for (var i = 1; i < fields.length; i += 3) {
            if (!ret && fields[i].indexOf(validRepo + repo.repoName) !== -1) {
                ret = fields[i - 1];
            }
        }
    });

    if (ret) {
        return ret;
    }
    apputil.fatal('Could not find an apache remote for repo ' + repo.repoName);
}
