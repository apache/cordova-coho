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
var repoupdate = require('./repo-update');
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

function retrieveCurrentTagName() {
    // This will return the tag name plus commit info it not directly at a tag.
    // That's fine since all users of this function are meant to use the result
    // in an equality check.
    return executil.execHelper(executil.ARGS('git describe --tags HEAD'), true, true);
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
        yield repoupdate.updateRepos([repo], branches, false);
        for (var i = 0; i < branches.length; ++i) {
            var branchName = branches[i];
            if (!(yield gitutil.localBranchExists(branchName))) {
                continue;
            }
            var isNewBranch = !(yield gitutil.remoteBranchExists(repo, branchName));

            yield gitutil.gitCheckout(branchName);

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
                yield gitutil.stashAndPop(cordovaJsRepo, function*() {
                    if (getVersionBranchName(version) == 'master') {
                        yield gitutil.gitCheckout('master');
                    } else {
                        yield gitutil.gitCheckout(version);
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
        if (yield gitutil.pendingChangesExist()) {
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
        if (!(yield gitutil.pendingChangesExist())) {
            print('VERSION file was already up-to-date.');
        }
    } else {
        console.warn('No VERSION file exists in repo ' + repo.repoName);
    }

    if (yield gitutil.pendingChangesExist()) {
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
    yield repoupdate.updateRepos(repos, [], true);

    var cordovaJsRepo = repoutil.getRepoById('js');

    // Ensure cordova-js comes first.
    var repoIndex = repos.indexOf(cordovaJsRepo);
    if (repoIndex != -1) {
        repos.splice(repoIndex, 1);
        repos.unshift(cordovaJsRepo);
    }

    yield repoutil.forEachRepo(repos, function*(repo) {
        yield gitutil.stashAndPop(repo, function*() {
            // git fetch + update master
            yield repoupdate.updateRepos([repo], ['master'], false);

            // Either create or pull down the branch.
            if (yield gitutil.remoteBranchExists(repo, branchName)) {
                print('Remote branch already exists for repo: ' + repo.repoName);
                // Check out and rebase.
                yield repoupdate.updateRepos([repo], [branchName], true);
                yield gitutil.gitCheckout(branchName);
            } else if (yield gitutil.localBranchExists(branchName)) {
                yield executil.execHelper(executil.ARGS('git checkout ' + branchName));
            } else {
                yield gitutil.gitCheckout('master');
                yield executil.execHelper(executil.ARGS('git checkout -b ' + branchName));
            }
            yield updateJsSnapshot(repo, version);
            print(repo.repoName + ': ' + 'Setting VERSION to "' + version + '" on branch + "' + branchName + '".');
            yield updateRepoVersion(repo, version);

            yield gitutil.gitCheckout('master');
            var devVersion = createPlatformDevVersion(version);
            print(repo.repoName + ': ' + 'Setting VERSION to "' + devVersion + '" on branch + "master".');
            yield updateRepoVersion(repo, devVersion);
            yield updateJsSnapshot(repo, devVersion);
            yield gitutil.gitCheckout(branchName);
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
    yield repoupdate.updateRepos(repos, [], true);

    function *execOrPretend(cmd) {
        if (pretend) {
            print('PRETENDING TO RUN: ' + cmd.join(' '));
        } else {
            yield executil.execHelper(cmd);
        }
    }
    yield repoutil.forEachRepo(repos, function*(repo) {
        yield gitutil.stashAndPop(repo, function*() {
            // git fetch.
            yield repoupdate.updateRepos([repo], [], false);

            if (yield gitutil.remoteBranchExists(repo, branchName)) {
                print('Remote branch already exists for repo: ' + repo.repoName);
                yield gitutil.gitCheckout(branchName);
            } else {
                apputil.fatal('Release branch does not exist for repo ' + repo.repoName);
            }

            // git merge
            yield repoupdate.updateRepos([repo], [branchName], true);

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
            entryPoint: require('./repo-clone')
        }, {
            name: 'repo-update',
            desc: 'Performs git pull --rebase on all specified repositories.',
            entryPoint: require('./repo-update')
        }, {
            name: 'repo-reset',
            desc: 'Performs git reset --hard origin/$BRANCH and git clean -f -d on all specified repositories.',
            entryPoint: require('./repo-reset')
        }, {
            name: 'repo-status',
            desc: 'Lists changes that exist locally but have not yet been pushed.',
            entryPoint: require('./repo-status')
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
