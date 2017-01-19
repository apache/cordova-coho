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
var repoclone = require('./repo-clone');
var versionutil = require('./versionutil');
var jira_client = require('jira-client');
var inquirer = require('inquirer');
var print = apputil.print;

/*
 * Pseudo code for plugin automation:
 * 1. Who are you? --> this is the release manager. Can we use JIRA for this?
 */
var jira; // issues.apache.org jira client object
var you; // store label for the user here
var jira_user; // store ref to jira project user
var cordova_project; // store ref to jira project for Cordova
var plugins_release_issue; // store ref to jira issue tracking release.
var jira_issue_types; // store ref to all issue types supported by our JIRA instance
var jira_task_issue; // store ref to the "task" issue type
var plugin_base; // parent directory holding all cordova plugins

module.exports.interactive = function *interactive_plugins_release() {
    console.log('Hi! So you want to do a plugins release, do you?');
    console.log('Let\'s start with your JIRA credentials - this system will be interacting with Apache\'s JIRA instance (issues.apache.org) often.');
    inquirer.prompt([{
        type: 'input',
        name: 'username',
        message: 'Please enter your JIRA username'
    },{
        type: 'password',
        name: 'password',
        message: 'Please enter your JIRA password'
    }]).then(function(answers) {
        var username = answers.username;
        you = username;
        var password = answers.password;
        jira = new jira_client({
              protocol: 'https',
              host: 'issues.apache.org',
              base: 'jira',
              apiVersion: '2',
              strictSSL: true,
              username: username,
              password: password
        });
        return jira.getCurrentUser();
    }).then(function(user) {
        jira_user = user;
        you = user.displayName || you; // either use JIRA display name, or username
        console.log('Hey', you, '!');
        console.log('Welcome. Let me pull some data from JIRA first...');
        return jira.listProjects();
    }).then(function(projects) {
        // Find the Apache Cordova (CB) project in Apache's JIRA
        for (var i = 0; i < projects.length; i++) {
            var project = projects[i];
            if (project.key == 'CB') {
                cordova_project = project;
                break;
            }
        }
        return jira.listIssueTypes();
    }).then(function(issue_types) {
        jira_issue_types = issue_types;
        for (var i = 0; i < issue_types.length; i++) {
            var it = issue_types[i];
            if (it.name == 'Task') {
                jira_task_issue = it;
            }
        }
        /*
         * 2. Are your gpg keys in place? maybe basic validation
         */
        inquirer.prompt({
            type: 'confirm',
            name: 'gpg',
            message: 'Are your GPG keys in place?'
        }).then(function(answer) {
            if (answer.gpg) {
                console.log('Great! Let\'s keep going.');
                return inquirer.prompt({
                    type: 'confirm',
                    name: 'discuss',
                    message: 'Did you start a "[DISCUSS] Plugins release" thread on the Cordova mailing list?'
                });
            } else {
                console.error('You should get your GPG keys sorted out first!');
                console.warn('Follow the instructions here, then come back and try again :)');
                console.warn('https://github.com/apache/cordova-coho/blob/master/docs/setting-up-gpg.md');
                process.exit(2);
            }
        }).then(function(answer) {
            /* 3. Y/N did you start a "[DISCUSS] Plugins release" thread on the mailing list?
             *   - Bonus: Can we parse the mailing list for this?
             */
            if (answer.discuss) {
                console.log('Nice! Way to keep everyone in the loop!');
                return inquirer.prompt({
                    type: 'confirm',
                    name: 'jira',
                    message: 'Is there a JIRA issue filed for the plugins release? (i.e. "Plugins Release, <recent date>") - if not, I will create one for you.'
                });
            } else {
                console.error('You definitely need to have a discussion about the plugins release on the mailing list first. Go do that!');
                process.exit(3);

            }
        }).then(function(answer) {
            /* 4. Ask for JIRA issue, or, Create JIRA issue; check docs/plugins-release-process.md for details
             *   - lets refer to this JIRA issue as $JIRA from here on out.
             *   - BONUS: COMMENT to this JIRA issue for each "top-level" step below that is completed.
             */
            if (answer.jira) {
                return inquirer.prompt({
                    type: 'input',
                    name: 'jira',
                    message: 'What is the JIRA issue number for your plugins release? Please provide only the numerical part of the issue key (i.e. CB-XXXXX)'
                }).then(function(answers) {
                    var cb_issue = 'CB-' + answers.jira;
                    console.log('Looking for ' + cb_issue + '...');
                    return jira.findIssue(cb_issue).then(function(issue) {
                        return issue;
                    }, function(err) {
                        console.error('Error finding issue ' + cb_issue + '!');
                        process.exit(3);
                    });
                });
            } else {
                console.warn('OK, no problem. I will create one for you now! Hang tight...');
                var date = (new Date()).toDateString();
                var new_issue = {
                    "fields": {
                        "project": {
                            "id": cordova_project.id
                        },
                        "summary": "Plugins Release, " + date,
                        "description": "Following steps at https://github.com/apache/cordova-coho/blob/master/docs/plugins-release-process.md",
                        "assignee": {
                            "name": jira_user.name
                        },
                        "issuetype": {
                            "id": jira_task_issue.id
                        },
                    }
                }
                return jira.addNewIssue(new_issue).then(function(issue) {
                    return issue;
                }, function(err) {
                    console.error('There was a problem creating the JIRA issue!', err);
                    process.exit(4);
                });
            }
        }).then(function(jira_issue) {
            console.log('Sweet, our Plugins Release JIRA issue is ' + jira_issue.key + ' (https://issues.apache.org/jira/browse/' + jira_issue.key + ')!');
            plugins_release_issue = jira_issue;
            /* Time for step 5: update the repos. */
            return inquirer.prompt([{
                type: 'input',
                name: 'cwd',
                default: apputil.getBaseDir(),
                message: 'We need to update the plugin repositories. Enter the directory containing all your plugin repository source code (absolute or relative paths work here)'
            }, {
                type: 'confirm',
                name: 'ok',
                message: function(answers) {
                    return 'WARNING! Are you sure the following directory is where you store your plugins? We will be cloning/updating repos here: ' + path.resolve(path.normalize(answers.cwd));
                }
            }]);
        }).then(function(answers) {
            if (answers.ok) {
                plugin_base = path.resolve(path.normalize(answers.cwd));
                // TODO: is `plugins_base` pass-able to cloneRepos here?
                var plugin_repos = flagutil.computeReposFromFlag('plugins', {includeSvn:true});
                yield require('./repo-clone').cloneRepos(plugin_repos, false, null);
            } else {
                console.error('Well you should type in the correct location the first time. Or this section of coho code should be coded more robustly! Contributions welcome :P');
                console.error('Please try again.');
                process.exit(4);
            }
        });
    }, function(auth_err) {
        var keys = Object.keys(auth_err);
        console.error('ERROR! There was a problem connecting to JIRA, received a', auth_err.statusCode, 'status code.');
        process.exit(1);
    });
    /* 6. ask user if they have a specific list of plugins to release, OR, auto-identify which plugins have changes. if auto-identifying, ask user to confirm at end. if wrong, ask user to manually input.
     * 7. ensure license headers are present everywhere.
     * 8. ensure all dependencies and subdependencies have apache-compatible licenses.
     * 9. update plugin versions + release notes.
     *   - for each plugin, remove the `-dev` suffix in plugin.xml, package.json, and plugin.xml of `tests/` subdirectory (if exists)
     *   - each plugin needs a version bump.
     *     - the plugin may already have an acceptably-bumped verison. perhaps grab latest-published version of plugin from npm and compare to version in source as a hint to RM
     *     - how to determine if patch, minor or major? show changes to each plugin and then prompt Release Manager for a decision?
     *     - reuse coho 'update release notes' command
     *     - what's the average case? just a patch bump? perhaps, for each plugin, show release notes and let RM override version beyond patch bump if RM believes it is necessary?
     *     - while reviewing changes for version bump, this is probably the right time to aggregate release notes. once aggregated, write them out to RELEASENOTES.md
     *     - commit changes to versions and release notes together with description '$JIRA Updated version and release notes for release $v'
     *     - tag each plugin repo with $v
     * 10. Create release branch. wtf is going on here?
     * 11. Increment plugin versions back on the master branch to include -dev.. i think?
     * 12. Push tags, release branch, and master branch changes.
     * 13. Publish to apache svn:
     *   - repo-clone the dist and dist/dev svn repos
     *   - create-archive -r $ACTIVE --dest cordova-dist-dev/$JIRA
     *   - "manually double check version numbers are correct on the file names"
     *   - verify-archive cordova-dist-dev/$JIRA/*.tgz
     *   - upload by running `svn` commands.
     * 14. Dump instructions only? Prepare blog post - perhaps can dump out release notes-based blog content.
     *   - this apparently ends up as a .md file in cordova-docs. perhaps can dump this as a shell of a file into the cordova-docs repo? maybe even auto-branch the docs repo in prep for a PR?
     * 15. Dump instructions only? Start a vote thread.
     * 16. Bonus: separate script to 'approve' a plugins release, which would:
     *   - publish the artifacts to dist/ in apache
     *   - "tell apache about the release" which has a TODO to write a helper to POST the request appropriately.
     *   - publish to npm
     *   - push 'permanent release tags' (for apache) to git
     *   - issue cordova-docs blog post PR (only if we auto-branch in cordova-docs repo, as per step 14)
     *   - dump instructions only? post an ANNOUNCE thread to ML.
     *   - close $JIRA issue
     */

    /*
     * TODO: Need ability to serialize process of plugins release - save state of the process at any point.
     */
}
// TODO: what is shared between plugin-release and platform-release helpers? factor out into util/lib/whatever helper modules

/*
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
*/

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

function *handleVersion(repo,ver,validate) {
    var platform = repo.id;
    var version = ver || undefined;

    if (version === undefined) {
        yield repoutil.forEachRepo([repo], function*() {
            // Grabbing version from platformPackageJson
            var platformPackage = path.join(process.cwd(), 'package.json');
            var platformPackageJson = require(platformPackage);
            if(validate === true) {
                version = flagutil.validateVersionString(platformPackageJson.version);
            } else {
                version = platformPackageJson.version;
            }
        });
    }
    return version;
}

function configureReleaseCommandFlags(opt) {
    var opt = flagutil.registerRepoFlag(opt)
    opt = opt
        .options('version', {
            desc: 'The version to use for the branch. Must match the pattern #.#.#[-rc#]'
         });
    opt = flagutil.registerHelpFlag(opt);
    argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    return argv;
}

var hasBuiltJs = '';

//Adds the version to CDVAvailability.h for iOS
function *updateCDVAvailabilityFile(version) {
    var iosFile = path.join(process.cwd(), 'CordovaLib', 'Classes', 'Public','CDVAvailability.h');
    var iosFileContents = fs.readFileSync(iosFile, 'utf8');
    iosFileContents = iosFileContents.split('\n');

    var lineNumberToInsertLine = iosFileContents.indexOf('/* coho:next-version,insert-before */');
    var lineNumberToReplaceLine = iosFileContents.indexOf('    /* coho:next-version-min-required,replace-after */') + 2;

    var versionNumberUnderscores = version.split('.').join('_');
    var versionNumberZeroes = version.split('.').join('0');

    var lineToAdd = util.format('#define __CORDOVA_%s %s', versionNumberUnderscores, versionNumberZeroes);
    var lineToReplace = util.format('    #define CORDOVA_VERSION_MIN_REQUIRED __CORDOVA_%s', versionNumberUnderscores);

    if(iosFileContents[lineNumberToInsertLine - 1] === lineToAdd) {
        print('Version already exists in CDVAvailability.h');
        lineNumberToReplaceLine = lineNumberToReplaceLine - 1;
    } else {
        iosFileContents.splice(lineNumberToInsertLine, 0, lineToAdd);
    }

    iosFileContents[lineNumberToReplaceLine] = lineToReplace;

    fs.writeFileSync(iosFile, iosFileContents.join('\n'));
}

function *updateJsSnapshot(repo, version, commit) {
    function *ensureJsIsBuilt() {
        var cordovaJsRepo = repoutil.getRepoById('js');
        if (repo.id === 'blackberry') {
            repo.id = 'blackberry10';
        }
        if (hasBuiltJs != version) {
            yield repoutil.forEachRepo([cordovaJsRepo], function*() {
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
        if(commit === true) {
            if (yield gitutil.pendingChangesExist()) {
                yield executil.execHelper(executil.ARGS('git commit -am', 'Update JS snapshot to version ' + version + ' (via coho)'));
            }
        }
    } else if (repoutil.repoGroups.all.indexOf(repo) != -1) {
        print('*** DO NOT KNOW HOW TO UPDATE cordova.js FOR THIS REPO ***');
    }
}

exports.createAndCopyCordovaJSCommand = function*() {
    var argv = configureReleaseCommandFlags(optimist
        .usage('Generates and copies an updated cordova.js to the specified platform. It does the following:\n' +
               '    1. Generates a new cordova.js.\n' +
               '    2. Replaces platform\'s cordova.js file.\n' +
               '\n' +
               'Usage: $0 copy-js -r platform')
    );

    var repos = flagutil.computeReposFromFlag(argv.r);
    yield repoutil.forEachRepo(repos, function*(repo) {
        var version = yield handleVersion(repo, argv.version, false);
        yield updateJsSnapshot(repo,version, false);
    });
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
               'Usage: $0 prepare-release-branch -r platform [--version=3.6.0]')
    );

    var repos = flagutil.computeReposFromFlag(argv.r);
    var branchName = null;

    // First - perform precondition checks.
    yield repoupdate.updateRepos(repos, [], true);

    yield repoutil.forEachRepo(repos, function*(repo) {
        var platform = repo.id;
        var version = yield handleVersion(repo, argv.version,true);
        var branchName = getVersionBranchName(version);

        yield gitutil.stashAndPop(repo, function*() {
            // git fetch + update master
            yield repoupdate.updateRepos([repo], ['master'], false);
            if (platform === 'ios') {
                // Updates version in CDVAvailability.h file
                yield updateCDVAvailabilityFile(version);
                // Git commit changes
                if(yield gitutil.pendingChangesExist()) {
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
            var devVersion = createPlatformDevVersion(version);
            print(repo.repoName + ': Setting VERSION to "' + devVersion + '" on branch "master".');
            yield versionutil.updateRepoVersion(repo, devVersion);
            yield updateJsSnapshot(repo, devVersion, true);
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
            if (tagName != version) {
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
}
