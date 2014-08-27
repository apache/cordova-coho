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

var fs = require('fs');
var path = require('path');
var optimist = require('optimist');
var shelljs = require('shelljs');
var apputil = require('./apputil');
var executil = require('./executil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');
var repoupdate = require('./repo-update');
var print = apputil.print;

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
    shelljs.cp('-f', src, dest);
    if (shelljs.error()) {
        apputil.fatal('Copy failed.');
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
yield executil.execHelper(executil.ARGS('ls'));
                yield gitutil.stashAndPop(cordovaJsRepo, function*() {
                    //git fetch and update master for cordovajs
                    yield repoupdate.updateRepos([cordovaJsRepo], ['master'], false);
                    yield gitutil.gitCheckout('master'); 
                    yield executil.execHelper(executil.ARGS('grunt compile:' +repo.id + ' --platformVersion='+version));
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
        shelljs.config.fatal = true;
        if (repo.id == 'android' || repo.id == 'amazon-fireos') {
            shelljs.sed('-i', /CORDOVA_VERSION.*=.*;/, 'CORDOVA_VERSION = "' + version + '";', path.join('framework', 'src', 'org', 'apache', 'cordova', 'CordovaWebView.java'));
            shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'templates', 'cordova', 'version'));
        } else if (repo.id == 'blackberry') {
            shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'templates', 'project','cordova', 'lib', 'version.js'));
        } else if (repo.id == 'firefoxos') {
            shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'templates', 'project','cordova', 'version'));
        } else if (repo.id == 'ubuntu') {
            shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'build', 'version'));
        } 
        shelljs.config.fatal = false;
        if (!(yield gitutil.pendingChangesExist())) {
            print('VERSION file was already up-to-date.');
        }
    } else {
        console.warn('No VERSION file exists in repo ' + repo.repoName);
    }
    
    // Update the package.json VERSION.
    var packageFilePaths = repo.packageFilePaths || ['package.json'];
    if (fs.existsSync(packageFilePaths[0])) {
        fs.readFile(packageFilePaths[0], {encoding: 'utf-8'},function (err, data) {
            if (err) throw err;
            var packageJSON = JSON.parse(data);
            packageJSON.version = version;
            fs.writeFileSync(packageFilePaths[0], JSON.stringify(packageJSON, null, "    "));
        }); 
        if (!(yield gitutil.pendingChangesExist())) {
            print('package.json file was already up-to-date.');
        }
    } else {
        console.warn('No package.json file exists in repo ' + repo.repoName);
    }

    if (yield gitutil.pendingChangesExist()) {
        yield executil.execHelper(executil.ARGS('git commit -am', 'Set VERSION to ' + version + ' (via coho)'));
    }
}

exports.prepareReleaseBranchCommand = function*() {
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
               'Usage: $0 prepare-release-branch --version=3.6.0 -r platform')
    );
    var repos = flagutil.computeReposFromFlag(argv.r);
    var version = flagutil.validateVersionString(argv.version);
    var branchName = getVersionBranchName(version);

    // First - perform precondition checks.
    yield repoupdate.updateRepos(repos, [], true);
    
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

function *tagJs(repo, version, pretend) {

    function *execOrPretend(cmd) {
        if (pretend) {
            print('PRETENDING TO RUN: ' + cmd.join(' '));
        } else {
            yield executil.execHelper(cmd);
        }
    }

    //tag cordova.js platform-version
    var cordovaJsRepo = repoutil.getRepoById('js');
    yield repoutil.forEachRepo([cordovaJsRepo], function*() {
        yield gitutil.stashAndPop(cordovaJsRepo, function*() {
            // git fetch
            yield repoupdate.updateRepos([cordovaJsRepo], ['master'], false);

            if (yield gitutil.tagExists(repo.id + '-' + version)) {
                yield execOrPretend(executil.ARGS('git tag ' + repo.id + '-' + version + ' --force'));
            } else {
                yield execOrPretend(executil.ARGS('git tag ' + repo.id + '-' + version));
            }
            yield execOrPretend(executil.ARGS('git push --tags ' + repo.remoteName)); 
        });
    });
}


exports.tagReleaseBranchCommand = function*(argv) {
    var argv = configureReleaseCommandFlags(optimist
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
            var tagName = yield gitutil.retrieveCurrentTagName();
            console.log(tagName);
            console.log(repo);
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
            yield tagJs(repo, version, pretend);
                
        });
    });

    print('');
    print('All work complete.');
}
