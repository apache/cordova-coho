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

var co = require('co');
var fs = require('fs');
var path = require('path');
var flagutil = require('./flagutil');
var apputil = require('./apputil');
var executil = require('./executil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');
var print = apputil.print;
try {
    var optimist = require('optimist');
    var shjs = require('shelljs');
    var Q = require('q');
} catch (e) {
    console.log('Please run "npm install" from this directory:\n\t' + __dirname);
    process.exit(2);
}

function createPlatformDevVersion(version) {
    // e.g. "3.1.0" -> "3.2.0-dev".
    // e.g. "3.1.2-0.8.0-rc2" -> "3.2.0-0.8.0-dev".
    version = version.replace(/-rc.*$/, '');
    var parts = version.split('.');
    parts[1] = String(+parts[1] + 1);
    var cliSafeParts = parts[2].split('-');
    cliSafeParts[0] = '0';
    parts[2] = cliSafeParts.join('-');
    return parts.join('.') + '-dev';
}

function getVersionBranchName(version) {
    if (/-dev$/.test(version)) {
        return 'master';
    }
    return version.replace(/\d+(-?rc\d)?$/, 'x');
}

function cpAndLog(src, dest) {
    print('Coping File:', src, '->', dest);
    // Throws upon failure.
    shjs.cp('-f', src, dest);
    if (shjs.error()) {
        apputil.fatal('Copy failed.');
    }
}

function *gitCheckout(branchName) {
    var curBranch = yield retrieveCurrentBranchName(true);
    if (curBranch != branchName) {
        return yield executil.execHelper(executil.ARGS('git checkout -q ', branchName));
    }
}

function createRepoUrl(repo) {
    return 'https://git-wip-us.apache.org/repos/asf/' + repo.repoName + '.git';
}

function *localBranchExists(name) {
    return !!(yield executil.execHelper(executil.ARGS('git branch --list ' + name), true));
}

function *remoteBranchExists(repo, name) {
    return !!(yield executil.execHelper(executil.ARGS('git branch -r --list ' + repo.remoteName + '/' + name), true));
}

function *retrieveCurrentBranchName(allowDetached) {
    var ref = yield executil.execHelper(executil.ARGS('git symbolic-ref HEAD'), true, true);
    if (!ref) {
        if (allowDetached) {
            return null;
        }
        throw new Error('Aborted due to repo ' + shjs.pwd() + ' not being on a named branch');
    }
    var match = /refs\/heads\/(.*)/.exec(ref);
    if (!match) {
        throw new Error('Could not parse branch name from: ' + ref);
    }
    return match[1];
}

function retrieveCurrentTagName() {
    // This will return the tag name plus commit info it not directly at a tag.
    // That's fine since all users of this function are meant to use the result
    // in an equality check.
    return executil.execHelper(executil.ARGS('git describe --tags HEAD'), true, true);
}

function *repoCloneCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Clones git repositories into the current working directory. If the repositories are already cloned, then this is a no-op.\n\n' +
               'Usage: $0 clone --repo=name [--repo=othername]')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);
    yield cloneRepos(repos, false);
}

function *cloneRepos(repos, quiet) {
    var failures = [];
    var numSkipped = 0;

    for (var i = 0; i < repos.length; ++i) {
        var repo = repos[i];
        if (shjs.test('-d', repo.repoName)) {
            if(!quiet) print('Repo already cloned: ' + repo.repoName);
            numSkipped +=1 ;
        } else if (repo.svn) {
            yield executil.execHelper(executil.ARGS('svn checkout ' + repo.svn + ' ' + repo.repoName));
        } else {
            yield executil.execHelper(executil.ARGS('git clone --progress ' + createRepoUrl(repo)));
        }
    }

    var numCloned = repos.length - numSkipped;
    if (numCloned) {
        print('Successfully cloned ' + numCloned + ' repositories.');
    }
}

function *repoStatusCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    var opt = optimist
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
         })
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Reports what changes exist locally that are not yet pushed.\n' +
               '\n' +
               'Example usage: $0 repo-status -r auto -b master -b 2.9.x\n' +
               'Example usage: $0 repo-status -r plugins -b dev --branch2 master --diff')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var branches = argv.b && (Array.isArray(argv.b) ? argv.b : [argv.b]);
    var branches2 = branches && argv.branch2 && (Array.isArray(argv.branch2) ? argv.branch2 : [argv.branch2]);
    var repos = flagutil.computeReposFromFlag(argv.r);

    if (branches2 && branches && branches.length != branches2.length) {
        apputil.fatal('Must specify the same number of --branch and --branch2 flags');
    }

    yield repoutil.forEachRepo(repos, function*(repo) {
        if (repo.svn) {
            print('repo-status not implemented for svn repos');
            return;
        }
        // Determine remote name.
        yield updateRepos([repo], [], true);
        var actualBranches = branches ? branches : /^plugin/.test(repo.id) ? ['dev', 'master'] : ['master'];
        for (var i = 0; i < actualBranches.length; ++i) {
            var branchName = actualBranches[i];
            if (!(yield localBranchExists(branchName))) {
                continue;
            }
            var targetBranch = branches2 ? branches2[i] : ((yield remoteBranchExists(repo, branchName)) ? repo.remoteName + '/' + branchName : 'master');
            var changes = yield executil.execHelper(executil.ARGS('git log --no-merges --oneline ' + targetBranch + '..' + branchName), true);
            if (changes) {
                print('Local commits exist on ' + branchName + ':');
                console.log(changes);
            }
        }
        var gitStatus = yield executil.execHelper(executil.ARGS('git status --short'), true);
        if (gitStatus) {
            print('Uncommitted changes:');
            console.log(gitStatus);
        }
    });
    if (argv.diff) {
        yield repoutil.forEachRepo(repos, function*(repo) {
            var actualBranches = branches ? branches : [/^plugin/.test(repo.id) ? 'dev' : 'master'];
            for (var i = 0; i < actualBranches.length; ++i) {
                var branchName = actualBranches[i];
                if (!(yield localBranchExists(branchName))) {
                    return;
                }
                var targetBranch = branches2 ? branches2[i] : ((yield remoteBranchExists(repo, branchName)) ? repo.remoteName + '/' + branchName : 'master');
                var diff = yield executil.execHelper(executil.ARGS('git diff ' + targetBranch + '...' + branchName), true);
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
}

function *repoResetCommand(argv) {
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
               '    git reset --hard origin/$BRANCH_NAME\n' +
               '    git clean -f -d\n' +
               '    if ($BRANCH_NAME exists only locally) then\n' +
               '        git branch -D $BRANCH_NAME\n' +
               '\n' +
               'Usage: $0 repo-reset -r auto -b master -b 2.9.x')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var branches = Array.isArray(argv.b) ? argv.b : [argv.b];
    var repos = flagutil.computeReposFromFlag(argv.r);

    function *cleanRepo(repo) {
        for (var i = 0; i < branches.length; ++i) {
            var branchName = branches[i];
            if (!(yield localBranchExists(branchName))) {
                continue;
            }
            if (yield remoteBranchExists(repo, branchName)) {
                yield gitCheckout(branchName);
                var changes = yield executil.execHelper(executil.ARGS('git log --oneline ' + repo.remoteName + '/' + branchName + '..' + branchName));
                if (changes) {
                    print(repo.repoName + ' on branch ' + branchName + ': Local commits exist. Resetting.');
                    yield executil.execHelper(executil.ARGS('git reset --hard ' + repo.remoteName + '/' + branchName));
                } else {
                    print(repo.repoName + ' on branch ' + branchName + ': No local commits to reset.');
                }
            } else {
                if ((yield retrieveCurrentBranchName()) == branchName) {
                    yield gitCheckout('master');
                }
                print(repo.repoName + ' deleting local-only branch ' + branchName + '.');
                yield executil.execHelper(executil.ARGS('git log --oneline -3 ' + branchName));
                yield executil.execHelper(executil.ARGS('git branch -D ' + branchName));
            }
        }
    }
    yield repoutil.forEachRepo(repos, function*(repo) {
        // Determine remote name.
        yield updateRepos([repo], [], true);
        var branchName = yield retrieveCurrentBranchName();
        if (branches.indexOf(branchName) == -1) {
            yield stashAndPop(repo, function*() {
                yield cleanRepo(repo);
            });
        } else {
            yield executil.execHelper(executil.ARGS('git clean -f -d'));
            yield cleanRepo(repo);
        }
    });
}

function *repoPushCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    var opt = optimist
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to push. Can be specified multiple times to specify multiple branches.',
            default: ['master', 'dev']
         });
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Pushes changes to the remote repository.\n' +
               '\n' +
               'Usage: $0 repo-push -r auto -b master -b 2.9.x')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var branches = Array.isArray(argv.b) ? argv.b : [argv.b];
    var repos = flagutil.computeReposFromFlag(argv.r);

    yield repoutil.forEachRepo(repos, function*(repo) {
        // Update first.
        yield updateRepos([repo], branches, false);
        for (var i = 0; i < branches.length; ++i) {
            var branchName = branches[i];
            if (!(yield localBranchExists(branchName))) {
                continue;
            }
            var isNewBranch = !(yield remoteBranchExists(repo, branchName));

            yield gitCheckout(branchName);

            if (isNewBranch) {
                yield executil.execHelper(executil.ARGS('git push --set-upstream ' + repo.remoteName + ' ' + branchName));
            } else {
                var changes = yield executil.execHelper(executil.ARGS('git log --oneline ' + repo.remoteName + '/' + branchName + '..' + branchName), true);
                if (changes) {
                    yield executil.execHelper(executil.ARGS('git push ' + repo.remoteName + ' ' + branchName));
                } else {
                    print(repo.repoName + ' on branch ' + branchName + ': No local commits exist.');
                }
            }
        }
    });
}

function *repoUpdateCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    var opt = opt
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to update. Can be specified multiple times to update multiple branches.',
            default: ['master', 'dev']
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
               'Usage: $0 repo-update')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var branches = Array.isArray(argv.b) ? argv.b : [argv.b];
    var repos = flagutil.computeReposFromFlag(argv.r);

    // ensure that any missing repos are cloned
    yield cloneRepos(repos,true);
    yield updateRepos(repos, branches, !argv.fetch);
}

function *determineApacheRemote(repo) {
    var fields = (yield executil.execHelper(executil.ARGS('git remote -v'), true)).split(/\s+/);
    var ret = null;
    for (var i = 1; i < fields.length; i += 3) {
        ['git-wip-us.apache.org/repos/asf/', 'git.apache.org/'].forEach(function(validRepo) {
            if (fields[i].indexOf(validRepo + repo.repoName) != -1) {
                ret = fields[i - 1];
            }
        });
    }
    if (ret)
        return ret;
    apputil.fatal('Could not find an apache remote for repo ' + repo.repoName);
}

function *pendingChangesExist() {
    return !!(yield executil.execHelper(executil.ARGS('git status --porcelain'), true));
}

function *stashAndPop(repo, func) {
    var requiresStash = yield pendingChangesExist();
    var branchName = yield retrieveCurrentBranchName();

    if (requiresStash) {
        yield executil.execHelper(executil.ARGS('git stash save --all --quiet', 'coho stash'));
    }

    yield func();

    yield gitCheckout(branchName);
    if (requiresStash) {
        yield executil.execHelper(executil.ARGS('git stash pop'));
    }
}

function *updateRepos(repos, branches, noFetch) {
    // Pre-fetch checks.
    yield repoutil.forEachRepo(repos, function*(repo) {
        if (repo.svn) {
            return;
        }
        // Ensure it's on a named branch.
        yield retrieveCurrentBranchName();
        // Find the apache remote.
        if (!repo.remoteName) {
            repo.remoteName = yield determineApacheRemote(repo);
        }
    });

    if (!noFetch) {
        yield repoutil.forEachRepo(repos, function*(repo) {
            if (repo.svn) {
                return;
            }
            // TODO - can these be combined? Fetching with --tags seems to not pull in changes...
            yield executil.execHelper(executil.ARGS('git fetch --progress ' + repo.remoteName));
            yield executil.execHelper(executil.ARGS('git fetch --progress --tags ' + repo.remoteName));
        });
    }

    if (branches && branches.length) {
        yield repoutil.forEachRepo(repos, function*(repo) {
            if (repo.svn) {
                yield executil.execHelper(executil.ARGS('svn up'));
                return;
            }
            var staleBranches = {};
            for (var i = 0; i < branches.length; ++i) {
                var branchName = branches[i];
                if (yield remoteBranchExists(repo, branches[i])) {
                    var changes = yield executil.execHelper(executil.ARGS('git log --oneline ' + branchName + '..' + repo.remoteName + '/' + branchName), true, true);
                    staleBranches[branchName] = !!changes;
                }
            }
            var staleBranches = branches.filter(function(branchName) {
                return !!staleBranches[branchName];
            });
            if (!staleBranches.length) {
                print('Confirmed already up-to-date: ' + repo.repoName);
            } else {
                print('Updating ' + repo.repoName);
                yield stashAndPop(repo, function*() {
                    for (var i = 0; i < staleBranches.length; ++i) {
                        var branchName = staleBranches[i];
                        yield gitCheckout(branchName);
                        var ret = yield executil.execHelper(executil.ARGS('git rebase ' + repo.remoteName + '/' + branchName), false, true);
                        if (ret === null) {
                            console.log('\n\nUpdate failed. Run again with --no-fetch to try again without re-fetching.');
                            process.exit(1);
                        }
                    }
                });
            }
        });
    }
}

function configureReleaseCommandFlags(opt) {
    var opt = flagutil.registerRepoFlag(opt)
    opt = opt
        .options('version', {
            desc: 'The version to use for the branch. Must match the pattern #.#.#[-rc#]',
            demand: true
         });
    opt = flagutil.registerHelpFlag(opt);
    argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var version = flagutil.validateVersionString(argv.version);
    return argv;
}

var hasBuiltJs = '';

function *updateJsSnapshot(repo, version) {
    function *ensureJsIsBuilt() {
        var cordovaJsRepo = repoutil.getRepoById('js');
        if (hasBuiltJs != version) {
            yield repoutil.forEachRepo([cordovaJsRepo], function*() {
                yield stashAndPop(cordovaJsRepo, function*() {
                    if (getVersionBranchName(version) == 'master') {
                        yield gitCheckout('master');
                    } else {
                        yield gitCheckout(version);
                    }
                    yield executil.execHelper(executil.ARGS('grunt'));
                    hasBuiltJs = version;
                });
            });
        }
    }

    if (repoutil.repoGroups.platform.indexOf(repo) == -1) {
        return;
    }

    if (repo.cordovaJsPaths) {
        yield ensureJsIsBuilt();
        repo.cordovaJsPaths.forEach(function(jsPath) {
            var src = path.join('..', 'cordova-js', 'pkg', repo.cordovaJsSrcName || ('cordova.' + repo.id + '.js'));
            cpAndLog(src, jsPath);
        });
        if (yield pendingChangesExist()) {
            yield executil.execHelper(executil.ARGS('git commit -am', 'Update JS snapshot to version ' + version + ' (via coho)'));
        }
    } else if (repoutil.repoGroups.all.indexOf(repo) != -1) {
        print('*** DO NOT KNOW HOW TO UPDATE cordova.js FOR THIS REPO ***');
    }
}

function *updateRepoVersion(repo, version) {
    // Update the VERSION files.
    var versionFilePaths = repo.versionFilePaths || ['VERSION'];
    if (fs.existsSync(versionFilePaths[0])) {
        versionFilePaths.forEach(function(versionFilePath) {
            fs.writeFileSync(versionFilePath, version + '\n');
        });
        shjs.config.apputil.fatal = true;
        if (repo.id == 'android') {
            shjs.sed('-i', /CORDOVA_VERSION.*=.*;/, 'CORDOVA_VERSION = "' + version + '";', path.join('framework', 'src', 'org', 'apache', 'cordova', 'CordovaWebView.java'));
            shjs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'templates', 'cordova', 'version'));
        }
        shjs.config.apputil.fatal = false;
        if (!(yield pendingChangesExist())) {
            print('VERSION file was already up-to-date.');
        }
    } else {
        console.warn('No VERSION file exists in repo ' + repo.repoName);
    }

    if (yield pendingChangesExist()) {
        yield executil.execHelper(executil.ARGS('git commit -am', 'Set VERSION to ' + version + ' (via coho)'));
    }
}

function *prepareReleaseBranchCommand() {
    var argv = configureReleaseCommandFlags(optimist
        .usage('Prepares release branches but does not create tags. This includes:\n' +
               '    1. Creating the branch if it doesn\'t already exist\n' +
               '    2. Updating cordova.js snapshot and VERSION file.\n' +
               '\n' +
               'Command is safe to run multiple times, and can be run for the purpose\n' +
               'of checking out existing release branches.\n' +
               '\n' +
               'Command can also be used to update the JS snapshot after release \n' +
               'branches have been created.\n' +
               '\n' +
               'Usage: $0 prepare-release-branch --version=2.8.0-rc1')
    );
    var repos = flagutil.computeReposFromFlag(argv.r);
    var version = flagutil.validateVersionString(argv.version);
    var branchName = getVersionBranchName(version);

    // First - perform precondition checks.
    yield updateRepos(repos, [], true);

    var cordovaJsRepo = repoutil.getRepoById('js');

    // Ensure cordova-js comes first.
    var repoIndex = repos.indexOf(cordovaJsRepo);
    if (repoIndex != -1) {
        repos.splice(repoIndex, 1);
        repos.unshift(cordovaJsRepo);
    }

    yield repoutil.forEachRepo(repos, function*(repo) {
        yield stashAndPop(repo, function*() {
            // git fetch + update master
            yield updateRepos([repo], ['master'], false);

            // Either create or pull down the branch.
            if (yield remoteBranchExists(repo, branchName)) {
                print('Remote branch already exists for repo: ' + repo.repoName);
                // Check out and rebase.
                yield updateRepos([repo], [branchName], true);
                yield gitCheckout(branchName);
            } else if (yield localBranchExists(branchName)) {
                yield executil.execHelper(executil.ARGS('git checkout ' + branchName));
            } else {
                yield gitCheckout('master');
                yield executil.execHelper(executil.ARGS('git checkout -b ' + branchName));
            }
            yield updateJsSnapshot(repo, version);
            print(repo.repoName + ': ' + 'Setting VERSION to "' + version + '" on branch + "' + branchName + '".');
            yield updateRepoVersion(repo, version);

            yield gitCheckout('master');
            var devVersion = createPlatformDevVersion(version);
            print(repo.repoName + ': ' + 'Setting VERSION to "' + devVersion + '" on branch + "master".');
            yield updateRepoVersion(repo, devVersion);
            yield updateJsSnapshot(repo, devVersion);
            yield gitCheckout(branchName);
        });
    });

    executil.reportGitPushResult(repos, ['master', branchName]);
}

function *tagReleaseBranchCommand(argv) {
    var argv = configureReleaseCommandFlags(optimist
        .usage('Tags a release branches.\n' +
               '\n' +
               'Usage: $0 tag-release --version=2.8.0-rc1')
        .options('pretend', {
            desc: 'Don\'t actually run git commands, just print out what would be run.',
         })
    );
    var repos = flagutil.computeReposFromFlag(argv.r);
    var version = flagutil.validateVersionString(argv.version);
    var pretend = argv.pretend;
    var branchName = getVersionBranchName(version);

    // First - perform precondition checks.
    yield updateRepos(repos, [], true);

    function *execOrPretend(cmd) {
        if (pretend) {
            print('PRETENDING TO RUN: ' + cmd.join(' '));
        } else {
            yield executil.execHelper(cmd);
        }
    }
    yield repoutil.forEachRepo(repos, function*(repo) {
        yield stashAndPop(repo, function*() {
            // git fetch.
            yield updateRepos([repo], [], false);

            if (yield remoteBranchExists(repo, branchName)) {
                print('Remote branch already exists for repo: ' + repo.repoName);
                yield gitCheckout(branchName);
            } else {
                apputil.fatal('Release branch does not exist for repo ' + repo.repoName);
            }

            // git merge
            yield updateRepos([repo], [branchName], true);

            // Create/update the tag.
            var tagName = yield retrieveCurrentTagName();
            if (tagName != version) {
                if (yield gitutil.tagExists(version)) {
                    yield execOrPretend(executil.ARGS('git tag ' + version + ' --force'));
                } else {
                    yield execOrPretend(executil.ARGS('git tag ' + version));
                }
                yield execOrPretend(executil.ARGS('git push --tags ' + repo.remoteName + ' ' + branchName));
            } else {
                print('Repo ' + repo.repoName + ' is already tagged.');
            }
        });
    });

    print('');
    print('All work complete.');
}

function main() {
    var commandList = [
        {
            name: 'repo-clone',
            desc: 'Clones git repositories into the current working directory.',
            entryPoint: repoCloneCommand
        }, {
            name: 'repo-update',
            desc: 'Performs git pull --rebase on all specified repositories.',
            entryPoint: repoUpdateCommand
        }, {
            name: 'repo-reset',
            desc: 'Performs git reset --hard origin/$BRANCH and git clean -f -d on all specified repositories.',
            entryPoint: repoResetCommand
        }, {
            name: 'repo-status',
            desc: 'Lists changes that exist locally but have not yet been pushed.',
            entryPoint: repoStatusCommand
        }, {
            name: 'repo-push',
            desc: 'Push changes that exist locally but have not yet been pushed.',
            entryPoint: repoPushCommand
        }, {
            name: 'list-repos',
            desc: 'Shows a list of valid values for the --repo flag.',
            entryPoint: require('./list-repos')
        }, {
            name: 'list-pulls',
            desc: 'Shows a list of GitHub pull requests for all specified repositories.',
            entryPoint: require('./list-pulls')
        }, {
            name: 'prepare-release-branch',
            desc: 'Branches, updates JS, updates VERSION. Safe to run multiple times.',
            entryPoint: prepareReleaseBranchCommand
        }, {
            name: 'tag-release',
            desc: 'Tags repos for a release.',
            entryPoint: tagReleaseBranchCommand
        }, {
            name: 'audit-license-headers',
            desc: 'Uses Apache RAT to look for missing license headers.',
            entryPoint: require('./audit-license-headers')
        }, {
            name: 'create-release-bug',
            desc: 'Creates a bug in JIRA for tracking the tasks involved in a new release',
            entryPoint: require('./create-release-bug')
        }, {
            name: 'create-archive',
            desc: 'Zips up a tag, signs it, and adds checksum files.',
            entryPoint: require('./create-verify-archive').createCommand
        }, {
            name: 'verify-archive',
            desc: 'Checks that archives are properly signed and hashed.',
            entryPoint: require('./create-verify-archive').verifyCommand
        }, {
            name: 'print-tags',
            desc: 'Prints out tags & hashes for the given repos. Used in VOTE emails.',
            entryPoint: require('./print-tags')
        }, {
            name: 'last-week',
            desc: 'Prints out git logs of things that happened last week.',
            entryPoint: require('./last-week')
        }, {
            name: 'for-each',
            desc: 'Runs a shell command in each repo.',
            entryPoint: require('./for-each')
        }, {
            name: 'list-release-urls',
            desc: 'List the apache git repo urls for release artifacts.',
            entryPoint: require('./list-release-urls')
        }
    ];
    var commandMap = {};
    for (var i = 0; i < commandList.length; ++i) {
        commandMap[commandList[i].name] = commandList[i];
    }
    var usage = 'Usage: $0 command [options]\n' +
               '\n' +
               'Valid commands:\n';
    for (var i = 0; i < commandList.length; ++i) {
        usage += '    ' + commandList[i].name + ': ' + commandList[i].desc + '\n';
    }
    usage += '\nFor help on a specific command: $0 command --help\n\n';
    usage += 'Some examples:\n';
    usage += '    ./cordova-coho/coho repo-clone -r plugins -r mobile-spec -r android -r ios -r cli\n';
    usage += '    ./cordova-coho/coho repo-update\n';
    usage += '    ./cordova-coho/coho foreach -r plugins "git checkout master"\n';
    usage += '    ./cordova-coho/coho foreach -r plugins "git clean -fd"\n';
    usage += '    ./cordova-coho/coho last-week --me';

    var command;
    var argv = optimist
        .usage(usage)
        .check(function(argv) {
            command = argv._[0];
            if (!command) {
                throw 'No command specified.';
            }
            if (!commandMap[command]) {
                throw 'Unknown command: ' + command;
            }
        }).argv;

    var entry = commandMap[command].entryPoint;
    co(entry)();
}
main();
