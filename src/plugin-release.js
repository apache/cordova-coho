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
var path = require('path');
var fs = require('fs');
var util = require('util');
var optimist = require('optimist');
var shelljs = require('shelljs');
var apputil = require('./apputil');
var audit_license = require('./audit-license-headers');
var tweak_release_notes = require('./update-release-notes');
var executil = require('./executil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');
var versionutil = require('./versionutil');
var repoupdate = require('./repo-update');
var repoclone = require('./repo-clone');
var reporeset = require('./repo-reset');
var jira_client = require('jira-client');
var inquirer = require('inquirer');
var semver = require('semver');
var linkify = require('jira-linkify');
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
var plugin_repos; // which plugins are we messing with? initially gets set to all plugin repos, later on gets filtered to only those we will release. an array of objects in a special coho-accepted format.
var plugin_data = {}; // massive object containing plugin release-relevant information
var plugins_to_release = []; // array of plugin names that need releasing
var plugins_ommitted = []; // array of plugin names that DO NOT need releasing

function *interactive_plugins_release() {
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
                        process.exit(4);
                    });
                });
            } else {
                console.warn('OK, no problem. I will create one for you now! Hang tight...');
                var date = (new Date()).toDateString();
                // TODO: remove the "testing" bits in the JIRA issue description below
                var new_issue = {
                    "fields": {
                        "project": {
                            "id": cordova_project.id
                        },
                        "summary": "[TESTING] Plugins Release, " + date,
                        "description": "PLEASE IGNORE - THIS IS TESTING JIRA AUTOMATION, WORK IN PROGRESS!\nFollowing steps at https://github.com/apache/cordova-coho/blob/master/docs/plugins-release-process.md",
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
                    process.exit(5);
                });
            }
        }).then(function(jira_issue) {
            console.log('Sweet, our Plugins Release JIRA issue is ' + jira_issue.key + ' (https://issues.apache.org/jira/browse/' + jira_issue.key + ')!');
            plugins_release_issue = jira_issue;
            /* 5: update the repos. */
            return inquirer.prompt([{
                type: 'input',
                name: 'cwd',
                default: apputil.getBaseDir(),
                message: 'We need to update the plugin repositories. Enter the directory containing all of your plugin source code repositories (absolute or relative paths work here)'
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
                plugin_repos = flagutil.computeReposFromFlag('plugins', {includeSvn:true});
                // TODO: wrapping yields in co is fugly
                return co.wrap(function *() {
                    yield repoclone.cloneRepos(plugin_repos, /*silent*/true, null);
                    yield reporeset.resetRepos(plugin_repos, ['master']);
                    yield repoupdate.updateRepos(plugin_repos, ['master'], /*noFetch*/false);
                    return true;
                })();
            } else {
                console.error('We cannot continue without the correct location to the plugin repositories. Try again.');
                process.exit(6);
            }
        }).then(function() {
            /* 6. auto-identify plugins that need changes, ask user to confirm at end. if wrong, ask user to manually input.*/
            console.log('Will attempt to auto-identify which plugins need changes... hold on to yer butt!');
            return co.wrap(function *() {
                yield repoutil.forEachRepo(plugin_repos, function*(repo) {
                    if (repo.repoName == 'cordova-plugins') return;
                    var last_release = (yield gitutil.findMostRecentTag())[0];
                    plugin_data[repo.repoName] = {
                        last_release: last_release
                    };
                    var changes = (yield gitutil.summaryOfChanges(last_release)).split('\n').filter(function(line) {
                        return (line.toLowerCase().indexOf('incremented plugin version') == -1);
                    });
                    if (changes.length > 0) {
                        plugin_data[repo.repoName].needs_release = true;
                        plugin_data[repo.repoName].changes = changes.join('\n');
                        plugins_to_release.push(repo.repoName);
                    } else {
                        plugin_data[repo.repoName].needs_release = false;
                        plugins_ommitted.push(repo.repoName);
                    }
                });
            })();
        }).then(function() {
            // TODO: handle the 'no plugins to release case'? is it even worth it?
            return inquirer.prompt({
                type: 'confirm',
                name: 'plugins_ok',
                message: 'I\'ve detected ' + plugins_to_release.length + ' plugin' + (plugins_to_release.length==1?'':'s') + ' to release: ' + plugins_to_release.join(', ') + '\nThat means we\'re skipping ' + plugins_ommitted.length + ' plugin' + (plugins_ommitted.length==1?'':'s') + ': ' + plugins_ommitted.join(', ') + '\nDo you want to proceed with the release process around the specified plugins above (and ommitting the ones specified as well)?'
            });
        }).then(function(answers) {
            if (answers.plugins_ok) {
                return plugins_to_release;
            } else {
                return inquirer.prompt({
                    type: 'input',
                    name: 'plugins_list',
                    message: 'Please enter the exact names of the plugin repositories you want to release, manually, with a space separating each plugin name'
                }).then(function(answer) {
                    return answer.plugins_list.split(' ');
                });
            }
        }).then(function(plugins_list) {
            // at this point we either have a verified, or manually-specified, list of plugins to release.
            plugins_to_release = plugins_list;
            // modify the coho-formatted list of plugin repos to filter out to only the plugins we want to release.
            plugin_repos = plugin_repos.filter(function(plugin) {
                return plugins_to_release.indexOf(plugin.repoName) > -1;
            });
            // and remove all the data we collected for plugins we no longer care about.
            var data_keys = Object.keys(plugin_data);
            data_keys.forEach(function(key) {
                if (plugins_to_release.indexOf(key) == -1) {
                    delete plugin_data[key];
                }
            });
            /* 7. ensure license headers are present everywhere.*/
            console.log('Checking license headers for specified plugin repos...');
            return co.wrap(function *() {
                var unknown_licenses = [];
                yield audit_license.scrubRepos(plugin_repos, /*silent*/true, /*allowError*/false, function(repo, stdout) {
                    var unknown = stdout.split('\n').filter(function(line) {
                        return line.indexOf('Unknown Licenses') > -1;
                    })[0];
                    if (unknown[0] != '0') {
                        // There are some unknown licenses!
                        unknown_licenses.push({repo:repo.repoName,unknown:unknown});
                    }
                });
                return yield Promise.resolve(unknown_licenses);
            })();
        }).then(function(unknowns) {
            if (unknowns.length) {
                console.warn('We identified some unknown licenses in plugin repos!');
                console.warn(unknowns);
                return inquirer.prompt({
                    type: 'confirm',
                    name: 'proceed',
                    message: 'Do you want to proceed even though there are license problems?'
                }).then(function(answer) {
                    if (!answer.proceed) {
                        console.error('License audit failed - good idea to abort. Fix it up and come back!');
                        process.exit(7);
                    }
                });
            } else {
                console.log('No license issues found - continuing.');
            }
        }).then(function() {
            //TODO:
            /* 8. ensure all dependencies and subdependencies have apache-compatible licenses.
             * 9. update plugin versions + release notes.
             *   - for each plugin, remove the `-dev` suffix in plugin.xml, package.json, and plugin.xml of `tests/` subdirectory (if exists)*/
            console.log('Removing the "-dev" suffix from versions...');
            return co.wrap(function *() {
                yield repoutil.forEachRepo(plugin_repos, function*(repo) {
                    var current_version = yield versionutil.getRepoVersion(repo);
                    var devless_version = versionutil.removeDev(current_version);
                    plugin_data[repo.repoName].current_release = devless_version;
                    yield versionutil.updateRepoVersion(repo, devless_version, {commitChanges:false});
                });
            })();
        }).then(function() {
            /*   - each plugin may need a version bump.
             *     - how to determine if patch, minor or major? show changes to each plugin and then prompt Release Manager for a decision?
             *     - reuse coho 'update release notes' command */
            var plugs = Object.keys(plugin_data);
            var release_note_prompts = [];
            plugs.forEach(function(plugin) {
                var data = plugin_data[plugin];
                var changes = data.changes;
                release_note_prompts.push({
                    type: 'editor',
                    name: plugin,
                    message: 'Please tweak and compile ' + plugin + ' release notes',
                    default: tweak_release_notes.createNotes(plugin, data.current_release, changes)
                });
                /*     - what's the average case? just a patch bump? perhaps, for each plugin, show release notes and let RM override version beyond patch bump if RM believes it is necessary? */
                release_note_prompts.push({
                    type: 'input',
                    name: plugin + '-version',
                    message: 'Please enter a semver-compatible version number for this release of ' + plugin + ', based on the changes below:\n' + changes,
                    default: data.current_release,
                    validate: function(input) {
                        if (semver.valid(input)) {
                            return true;
                        } else {
                            return 'That\'s not a valid semver version!';
                        }
                    }
                });
            });
            return inquirer.prompt(release_note_prompts);
        }).then(function(release_notes) {
            return co.wrap(function *() {
                console.log('Writing out new release notes and plugin versions (if applicable)...');
                yield repoutil.forEachRepo(plugin_repos, function*(repo) {
                    var plugin_name = repo.repoName;
                    if (plugin_data[repo.repoName].current_release != release_notes[plugin_name + '-version']) {
                        // Overwrite plugin version if, after release notes review, RM decided on a different version.
                        plugin_data[repo.repoName].current_release = release_notes[plugin_name + '-version'];
                        yield versionutil.updateRepoVersion(repo, plugin_data[repo.repoName].current_release, {commitChanges:false});
                    }
                    fs.writeFileSync(tweak_release_notes.FILE, release_notes[plugin_name], {encoding: 'utf8'});
                    linkify.file(tweak_release_notes.FILE);
                    /* - commit changes to versions and release notes together with description '$JIRA Updated version and release notes for release $v'
                     * - tag each plugin repo with $v*/
                    if (yield gitutil.pendingChangesExist()) {
                        yield gitutil.commitChanges(plugins_release_issue.key + ' Updated version and RELEASENOTES.md for release ' + plugin_data[repo.repoName].current_release);
                        yield gitutil.tagRepo(plugin_data[repo.repoName].current_release);
                    } else {
                        console.warn('No pending changes detected for ' + repo.repoName + '; that\'s probably not good eh?');
                    }
                });
            })();
        });
    }, function(auth_err) {
        var keys = Object.keys(auth_err);
        console.error('ERROR! There was a problem connecting to JIRA, received a', auth_err.statusCode, 'status code.');
        process.exit(1);
    });
    /* 10. Create release branch. if this is a patch release, it may already exist! in that case, merge master back into this existing release branch.
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
module.exports.interactive = interactive_plugins_release;
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

// TODO: if using this function only to retrieve repo version, use the new
// versionutil.getRepoVersion method instead.
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
