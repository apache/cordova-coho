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

const path = require('path');
const fs = require('fs');
const util = require('util');
const optimist = require('optimist');
const shelljs = require('shelljs');
const apputil = require('./apputil');
const executil = require('./executil');
const flagutil = require('./flagutil');
const gitutil = require('./gitutil');
const repoutil = require('./repoutil');
const repoupdate = require('./repo-update');
const versionutil = require('./versionutil');
const print = apputil.print;

function createPlatformDevVersion (version) {
    // e.g. "3.1.0" -> "3.2.0-dev".
    // e.g. "3.1.2-0.8.0-rc2" -> "3.2.0-0.8.0-dev".
    version = version.replace(/-rc.*$/, '');
    const parts = version.split('.');
    parts[1] = String(+parts[1] + 1);
    const cliSafeParts = parts[2].split('-');
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
    const platform = repo.id; // eslint-disable-line no-unused-vars
    let version = ver || undefined;

    if (version === undefined) {
        yield repoutil.forEachRepo([repo], function * () {
            // Grabbing version from platformPackageJson
            const platformPackage = path.join(process.cwd(), 'package.json');
            const platformPackageJson = require(platformPackage);
            if (validate === true) {
                version = flagutil.validateVersionString(platformPackageJson.version);
            } else {
                version = platformPackageJson.version;
            }
        });
    }
    return version;
}

function configureReleaseCommandFlags (_opt) {
    let opt = flagutil.registerRepoFlag(_opt);
    opt = opt
        .options('version', {
            desc: 'The version to use for the branch. Must match the pattern #.#.#[-rc#]'
        });
    opt = flagutil.registerHelpFlag(opt);

    const argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    return argv;
}

let hasBuiltJs = '';

// Adds the version to CDVAvailability.h for iOS or OSX
function * updateCDVAvailabilityFile (version, platform) {
    // Default to iOS
    let file = path.join(process.cwd(), 'CordovaLib', 'Classes', 'Public', 'CDVAvailability.h');

    if (platform === 'osx') {
        file = path.join(process.cwd(), 'CordovaLib', 'CordovaLib', 'Classes', 'Commands', 'CDVAvailability.h');
    }

    let fileContents = fs.readFileSync(file, 'utf8');
    fileContents = fileContents.split('\n');

    const lineNumberToInsertLine = fileContents.indexOf('/* coho:next-version,insert-before */');
    let lineNumberToReplaceLine = fileContents.indexOf('    /* coho:next-version-min-required,replace-after */') + 2;

    const versionNumberUnderscores = version.split('.').join('_');
    const versionNumberZeroes = version.split('.').join('0');

    const lineToAdd = util.format('#define __CORDOVA_%s %s', versionNumberUnderscores, versionNumberZeroes);
    const lineToReplace = util.format('    #define CORDOVA_VERSION_MIN_REQUIRED __CORDOVA_%s', versionNumberUnderscores);

    if (fileContents[lineNumberToInsertLine - 1] === lineToAdd) {
        print('Version already exists in CDVAvailability.h');
        lineNumberToReplaceLine = lineNumberToReplaceLine - 1;
    } else {
        fileContents.splice(lineNumberToInsertLine, 0, lineToAdd);
    }

    fileContents[lineNumberToReplaceLine] = lineToReplace;

    fs.writeFileSync(file, fileContents.join('\n'));
}

function * updateJsSnapshot (repo, version, commit) {
    function * ensureJsIsBuilt () {
        const cordovaJsRepo = repoutil.getRepoById('js');
        if (hasBuiltJs !== version) {
            yield repoutil.forEachRepo([cordovaJsRepo], function * () {
                yield gitutil.stashAndPop(cordovaJsRepo, function * () {
                    // git fetch and update master for cordovajs
                    yield repoupdate.updateRepos([cordovaJsRepo], ['master'], false);
                    yield gitutil.gitCheckout('master');
                    yield executil.execHelper(executil.ARGS('grunt compile:' + repo.id + ' --platformVersion=' + version), false, true);
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
            const src = path.join('..', 'cordova-js', 'pkg', repo.cordovaJsSrcName || ('cordova.' + repo.id + '.js'));
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
    const argv = configureReleaseCommandFlags(optimist
        .usage('Generates and copies an updated cordova.js to the specified platform. It does the following:\n' +
               '    1. Generates a new cordova.js.\n' +
               '    2. Replaces platform\'s cordova.js file.\n' +
               '\n' +
               'Usage: $0 copy-js -r platform')
    );

    const repos = flagutil.computeReposFromFlag(argv.r);
    yield repoutil.forEachRepo(repos, function * (repo) {
        const version = yield handleVersion(repo, argv.version, false);
        yield updateJsSnapshot(repo, version, false);
    });
};

exports.prepareReleaseBranchCommand = function * () {
    const argv = configureReleaseCommandFlags(optimist
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
               'Usage: $0 prepare-release-branch -r platform [--version=3.6.0]')
    );

    const repos = flagutil.computeReposFromFlag(argv.r);
    const branchName = null;

    // First - perform precondition checks.
    yield repoupdate.updateRepos(repos, [], true);

    yield repoutil.forEachRepo(repos, function * (repo) {
        const platform = repo.id;
        const version = yield handleVersion(repo, argv.version, true);
        const branchName = versionutil.getReleaseBranchNameFromVersion(version);

        yield gitutil.stashAndPop(repo, function * () {
            // git fetch + update master
            yield repoupdate.updateRepos([repo], ['master'], false);
            if (platform === 'ios' || platform === 'osx') {
                // Updates version in CDVAvailability.h file
                yield updateCDVAvailabilityFile(version, platform);
                // Git commit changes
                if (yield gitutil.pendingChangesExist()) {
                    yield executil.execHelper(executil.ARGS('git commit -am', 'Added ' + version + ' to CDVAvailability.h (via coho).'));
                }
            }
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

            yield updateJsSnapshot(repo, version, true);
            print(repo.repoName + ': Setting VERSION to "' + version + '" on branch "' + branchName + '".');
            yield versionutil.updateRepoVersion(repo, version);

            yield gitutil.gitCheckout('master');
            const devVersion = createPlatformDevVersion(version);
            print(repo.repoName + ': Setting VERSION to "' + devVersion + '" on branch "master".');
            yield versionutil.updateRepoVersion(repo, devVersion);
            yield updateJsSnapshot(repo, devVersion, true);
            yield gitutil.gitCheckout(branchName);
        });
    });
    executil.reportGitPushResult(repos, ['master', branchName]);
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
    const cordovaJsRepo = repoutil.getRepoById('js');
    yield repoutil.forEachRepo([cordovaJsRepo], function * () {
        yield gitutil.stashAndPop(cordovaJsRepo, function * () {
            // git fetch
            yield repoupdate.updateRepos([cordovaJsRepo], ['master'], false);

            const tagName = repo.id + '-' + version;
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
    const repos = flagutil.computeReposFromFlag(argv.r);
    const version = flagutil.validateVersionString(argv.version);
    const pretend = argv.pretend;
    const branchName = versionutil.getReleaseBranchNameFromVersion(version);

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
            const tagName = yield gitutil.retrieveCurrentTagName();
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
