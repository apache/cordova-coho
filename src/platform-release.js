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

var path = require('path');
var fs = require('fs');
var util = require('util');
var optimist = require('optimist');
var shelljs = require('shelljs');
var apputil = require('./apputil');
var executil = require('./executil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');
var repoupdate = require('./repo-update');
var versionutil = require('./versionutil');
var print = apputil.print;

function createPlatformDevVersion (version) {
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

function cpAndLog (src, dest) {
    print('Coping File:', src, '->', dest);
    // Throws upon failure.
    shelljs.cp('-f', src, dest);
    if (shelljs.error()) {
        apputil.fatal('Copy failed.');
    }
}

/*
 * A function that handles version if it is defined or undefined
 *
 * @param {String} repo                    current repo
 * @param {String|undefined} ver           current version that can be defined or undefined
 * @param {String|undefined} validate      current version that can be defined or undefined
 *
 * @return {String} version                Returns the calculated version
 *
 */
// TODO: if using this method to only retrieve repo version, use the new
// versionutil.getRepoVersion method.
function * handleVersion (repo, ver, validate) {
    var platform = repo.id; // eslint-disable-line no-unused-vars
    var version = ver || undefined;

    if (version === undefined) {
        yield repoutil.forEachRepo([repo], function * () {
            // Grabbing version from platformPackageJson
            var platformPackage = path.join(process.cwd(), 'package.json');
            var platformPackageJson = require(platformPackage);
            if (validate === true) {
                version = flagutil.validateVersionString(platformPackageJson.version);
            } else {
                version = platformPackageJson.version;
            }
        });
    }
    return version;
}

function configureReleaseCommandFlags (opt) {
    var opt = flagutil.registerRepoFlag(opt); // eslint-disable-line no-redeclare
    opt = opt
        .options('version', {
            desc: 'The version to use for the branch. Must match the pattern #.#.#[-rc#]'
        });
    opt = flagutil.registerHelpFlag(opt);
    /* eslint-disable no-undef */
    argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    return argv;
}
/* eslint-enable no-undef */
var hasBuiltJs = '';

// Adds the version to CDVAvailability.h for iOS
function * updateCDVAvailabilityFile (version) {
    var iosFile = path.join(process.cwd(), 'CordovaLib', 'Classes', 'Public', 'CDVAvailability.h');
    var iosFileContents = fs.readFileSync(iosFile, 'utf8');
    iosFileContents = iosFileContents.split('\n');

    var lineNumberToInsertLine = iosFileContents.indexOf('/* coho:next-version,insert-before */');
    var lineNumberToReplaceLine = iosFileContents.indexOf('    /* coho:next-version-min-required,replace-after */') + 2;

    var versionNumberUnderscores = version.split('.').join('_');
    var versionNumberZeroes = version.split('.').join('0');

    var lineToAdd = util.format('#define __CORDOVA_%s %s', versionNumberUnderscores, versionNumberZeroes);
    var lineToReplace = util.format('    #define CORDOVA_VERSION_MIN_REQUIRED __CORDOVA_%s', versionNumberUnderscores);

    if (iosFileContents[lineNumberToInsertLine - 1] === lineToAdd) {
        print('Version already exists in CDVAvailability.h');
        lineNumberToReplaceLine = lineNumberToReplaceLine - 1;
    } else {
        iosFileContents.splice(lineNumberToInsertLine, 0, lineToAdd);
    }

    iosFileContents[lineNumberToReplaceLine] = lineToReplace;

    fs.writeFileSync(iosFile, iosFileContents.join('\n'));
}

function * updateJsSnapshot (repo, version, commit, branch) {
    function * ensureJsIsBuilt () {
        var cordovaJsRepo = repoutil.getRepoById('js');
        if (repo.id === 'blackberry') {
            repo.id = 'blackberry10';
        }
        if (hasBuiltJs !== version) {
            yield repoutil.forEachRepo([cordovaJsRepo], function * () {
                yield gitutil.stashAndPop(cordovaJsRepo, function * () {
                    // git fetch and update master (or fetch other branch) for cordova-js
                    if (branch === 'master') {
                        yield repoupdate.updateRepos([cordovaJsRepo], [branch], false);
                    }
                    yield executil.execHelper(executil.ARGS('git checkout -q ' + branch));
                    yield gitutil.gitCheckout(branch);
                    yield executil.execHelper(executil.ARGS('npm install'), false, true); // WORKAROUND PART 1 for local grunt issue in cordova-js
                    yield executil.execHelper(executil.ARGS('grunt compile:' + repo.id + ' --platformVersion=' + version), false, true);
                    shelljs.rm('-fr', 'node_modules'); // WORKAROUND PART 2 for local grunt issue in cordova-js
                    hasBuiltJs = version;
                });
            });
        }
    }

    if (repoutil.repoGroups.platform.indexOf(repo) === -1) {
        return;
    }

    if (repo.cordovaJsPaths) {
        yield ensureJsIsBuilt();
        repo.cordovaJsPaths.forEach(function (jsPath) {
            var src = path.join('..', 'cordova-js', 'pkg', repo.cordovaJsSrcName || ('cordova.' + repo.id + '.js'));
            cpAndLog(src, jsPath);
        });
        if (commit === true) {
            if (yield gitutil.pendingChangesExist()) {
                yield executil.execHelper(executil.ARGS('git commit -am', 'Update JS snapshot to version ' + version + ' (via coho)'));
            }
        }
    } else if (repoutil.repoGroups.all.indexOf(repo) !== -1) {
        print('*** DO NOT KNOW HOW TO UPDATE cordova.js FOR THIS REPO ***');
    }
}

exports.createAndCopyCordovaJSCommand = function * () {
    var argv = configureReleaseCommandFlags(optimist
        .usage('Generates and copies an updated cordova.js to the specified platform. It does the following:\n' +
               '    1. Generates a new cordova.js.\n' +
               '    2. Replaces platform\'s cordova.js file.\n' +
               '\n' +
               'Usage: $0 copy-js -r platform [--js <cordova-js branch or tag name>]')
    );

    var repos = flagutil.computeReposFromFlag(argv.r);

    var jsBranchName = argv.js ? argv.js : 'master';

    yield repoutil.forEachRepo(repos, function * (repo) {
        var version = yield handleVersion(repo, argv.version, false);
        yield updateJsSnapshot(repo, version, false, jsBranchName);
    });
};

exports.prepareReleaseBranchCommand = function * () {
    var argv = configureReleaseCommandFlags(optimist
        .usage('Prepares release branches but does not create tags. This includes:\n' +
               '    1. Creating the branch if it doesn\'t already exist\n' +
               '    2. Generates and updates the cordova.js snapshot and VERSION file from master.\n' +
               '\n' +
               'Command is safe to run multiple times, and can be run for the purpose\n' +
               'of checking out existing release branches.\n' +
               '\n' +
               'Command can also be used to update the JS snapshot after release \n' +
               'branches have been created.\n' +
               '\n' +
               'Usage: $0 prepare-platform-release-branch -r platform [--version=3.6.0] [-b <platform branch name>] [--js <cordova-js branch or tag name>]')
    );

    var repos = flagutil.computeReposFromFlag(argv.r);

    // XXX TBD ???:
    var branchName = null;

    var isOtherRepoBranch = !!argv.b;
    var repoBranchName = isOtherRepoBranch ? argv.b : 'master';
    var jsBranchName = argv.js ? argv.js : 'master';

    // First - perform precondition checks.
    yield repoupdate.updateRepos(repos, [], true);

    yield repoutil.forEachRepo(repos, function * (repo) {
        var platform = repo.id;
        var version = yield handleVersion(repo, argv.version, true);
        var releaseBranchName = isOtherRepoBranch ? repoBranchName :
                versionutil.getReleaseBranchNameFromVersion(version);

        yield gitutil.stashAndPop(repo, function * () {
            // git fetch + update master
            yield repoupdate.updateRepos([repo], [repoBranchName], false);

            // Either create or pull down the branch.
            if (yield gitutil.remoteBranchExists(repo, releaseBranchName)) {
                print('Remote branch already exists for repo: ' + repo.repoName);
                // Check out and rebase.
                yield repoupdate.updateRepos([repo], [releaseBranchName], true);
                yield gitutil.gitCheckout(releaseBranchName);
            } else if (yield gitutil.localBranchExists(releaseBranchName)) {
                yield executil.execHelper(executil.ARGS('git checkout ' + releaseBranchName));
            } else if (isOtherRepoBranch) {
                yield executil.execHelper(executil.ARGS('git checkout ' + repoBranchName));
            } else {
                yield gitutil.gitCheckout('master');
                yield executil.execHelper(executil.ARGS('git checkout -b ' + releaseBranchName));
            }

            yield updateJsSnapshot(repo, version, true, jsBranchName);

            if (platform === 'ios' && /\d$/.test(version)) {
                // Updates version in CDVAvailability.h file
                yield updateCDVAvailabilityFile(version);
                // Git commit changes
                if (yield gitutil.pendingChangesExist()) {
                    yield executil.execHelper(executil.ARGS('git commit -am', 'Added ' + version + ' to CDVAvailability.h (via coho).'));
                }
            }

            print(repo.repoName + ': Setting VERSION to "' + version + '" on branch "' + releaseBranchName + '".');
            yield versionutil.updateRepoVersion(repo, version);

            // skip remaining steps for this repo if other repo branch was specified:
            if (isOtherRepoBranch) return;

            yield gitutil.gitCheckout('master');
            var devVersion = createPlatformDevVersion(version);
            print(repo.repoName + ': Setting VERSION to "' + devVersion + '" on branch "master".');
            yield versionutil.updateRepoVersion(repo, devVersion);
            yield updateJsSnapshot(repo, devVersion, true, jsBranchName);
            yield gitutil.gitCheckout(releaseBranchName);
        });
    });

    // XXX TBD ???:
    executil.reportGitPushResult(repos, [repoBranchName, branchName]);
};

function * tagJs (repo, version, pretend) {

    function * execOrPretend (cmd) {
        if (pretend) {
            print('PRETENDING TO RUN: ' + cmd.join(' '));
        } else {
            yield executil.execHelper(cmd);
        }
    }
    // tag cordova.js platform-version
    var cordovaJsRepo = repoutil.getRepoById('js');
    yield repoutil.forEachRepo([cordovaJsRepo], function * () {
        yield gitutil.stashAndPop(cordovaJsRepo, function * () {
            // git fetch
            yield repoupdate.updateRepos([cordovaJsRepo], ['master'], false);

            var tagName = repo.id + '-' + version;
            if (yield gitutil.tagExists(tagName)) {
                yield execOrPretend(executil.ARGS('git tag ' + tagName + ' --force'));
            } else {
                yield execOrPretend(executil.ARGS('git tag ' + tagName));
            }
            yield execOrPretend(executil.ARGS('git push ' + repo.remoteName + ' refs/tags/' + tagName));
        });
    });
}

exports.tagReleaseBranchCommand = function * (argv) {
    var argv = configureReleaseCommandFlags(optimist // eslint-disable-line
        .usage('Tags a release branches.\n' +
               '\n' +
               'Usage: $0 tag-release --version=2.8.0-rc1 -r platform')
        .options('pretend', {
            desc: 'Don\'t actually run git commands, just print out what would be run.',
            type: 'boolean'
        })
    );
    var repos = flagutil.computeReposFromFlag(argv.r);
    var version = flagutil.validateVersionString(argv.version);
    var pretend = argv.pretend;
    var branchName = versionutil.getReleaseBranchNameFromVersion(version);

    // First - perform precondition checks.
    yield repoupdate.updateRepos(repos, [], true);

    function * execOrPretend (cmd) {
        if (pretend) {
            print('PRETENDING TO RUN: ' + cmd.join(' '));
        } else {
            yield executil.execHelper(cmd);
        }
    }
    yield repoutil.forEachRepo(repos, function * (repo) {
        yield gitutil.stashAndPop(repo, function * () {
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
            var tagName = yield gitutil.retrieveCurrentTagName();
            if (tagName !== version) {
                if (yield gitutil.tagExists(version)) {
                    yield execOrPretend(executil.ARGS('git tag ' + version + ' --force'));
                } else {
                    yield execOrPretend(executil.ARGS('git tag ' + version));
                }
                yield execOrPretend(executil.ARGS('git push ' + repo.remoteName + ' ' + branchName + ' refs/tags/' + version));
            } else {
                print('Repo ' + repo.repoName + ' is already tagged.');
            }
            yield tagJs(repo, version, pretend);

        });
    });

    print('');
    print('All work complete.');
};
