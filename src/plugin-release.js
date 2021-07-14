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
var Q = require('q');
var glob = require('glob');
var path = require('path');
var fs = require('fs');
var shelljs = require('shelljs');
var apputil = require('./apputil');
var audit_license = require('./audit-license-headers');
var update_release_notes = require('./update-release-notes');
var create_archive = require('./create-verify-archive');
var executil = require('./executil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var svnutil = require('./svnutil');
var repoutil = require('./repoutil');
var versionutil = require('./versionutil');
var repoupdate = require('./repo-update');
var repoclone = require('./repo-clone');
var reporeset = require('./repo-reset');
var jira_client = require('jira-client');
var inquirer = require('inquirer');
var semver = require('semver');

/*
 * Pseudo code for plugin automation:
 * 1. Who are you? --> this is the release manager. Can we use JIRA for this?
 */
var jira; // issues.apache.org jira client object
var you; // store label for the user here
var jira_user; // store ref to jira project user
var cordova_project; // store ref to jira project for Cordova
var plugins_release_issue; // store ref to jira issue tracking release.
/* eslint-disable no-unused-vars */
var jira_issue_types; // store ref to all issue types supported by our JIRA instance
/* eslint-enable no-unused-vars */
var all_plugins_component; // store the specific component associated to the plugin issue.
var jira_task_issue; // store ref to the "task" issue type
var plugin_base; // parent directory holding all cordova plugins
var plugin_repos; // which plugins are we messing with? initially gets set to all plugin repos, later on gets filtered to only those we will release. an array of objects in a special coho-accepted format.
var dist_dev_svn; // cordova dist/dev repo
var dist_svn; // cordova dist repo
var svn_repos; // cordova dist and dist/dev svn repos
var plugin_data = {}; // massive object containing plugin release-relevant information
var plugins_to_release = []; // array of plugin names that need releasing
var plugins_ommitted = []; // array of plugin names that DO NOT need releasing
var plugins_to_merge_manually = []; // array of plugin names that RM will need to merge master into release branch manually.
var svn_user; // username for apache svn
var svn_password; // password for apache svn
var updated_repos; // sentinel variable for if we did repo updates
var created_distdev_dir; // sentinel var for if a new dir was created in cordova-dist-dev

function * updateDesiredRepos (repos) {
    if (!updated_repos) {
        updated_repos = true;
        yield repoclone.cloneRepos(repos, /* silent */true, null);
        yield reporeset.resetRepos(repos, ['master']);
        yield repoupdate.updateRepos(repos, ['master'], /* noFetch */false);
        yield repoclone.cloneRepos(svn_repos, /* silent */true, null);
        yield findChangesInPluginRepos(repos);
    }
}
function * findChangesInPluginRepos (repos) {
    yield repoutil.forEachRepo(repos, function * (repo) {
        if (repo.repoName === 'cordova-plugins') return;
        var last_release = (yield gitutil.findMostRecentTag())[0];
        plugin_data[repo.repoName] = {
            last_release: last_release
        };
        var changes = yield gitutil.summaryOfChanges(last_release);
        changes = changes.split('\n').filter(function (line) {
            return (line.toLowerCase().indexOf('incremented plugin version') === -1);
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
}

function manualPluginSelection () {
    return inquirer.prompt({
        type: 'checkbox',
        name: 'plugins_list',
        message: 'Select the plugins you want to release:',
        choices: plugin_repos.map(function (p) { return p.repoName; }).filter(function (p) { return p !== 'cordova-plugins'; })
    }).then(function (answer) {
        return answer.plugins_list;
    });
}

function * interactive_plugins_release () {
    console.log('Hi! So you want to do a plugins release, do you?');
    // sanity check for tooling that will be needed during releaser.
    if (!shelljs.which('gpg')) {
        console.warn("You'll need gpg installed and have your Apache GPG keys all set up to do a plugins release!");
        console.error('I did not find gpg on your PATH!');
        console.error('Refer to ' + create_archive.GPG_DOCS + ' for instructions on how to get that set up as a first step.');
        process.exit(1);
    }
    if (!shelljs.which('svn')) {
        console.warn("You'll need svn installed to do a plugins release!");
        console.error('I did not find `svn` on your PATH!');
        process.exit(1);
    }
    return Q.fcall(function () {
        if (process.env.JIRA_USER && process.env.JIRA_PASSWORD) {
            return {
                username: process.env.JIRA_USER,
                password: process.env.JIRA_PASSWORD
            };
        } else {
            console.log('Let\'s start with your JIRA credentials - this system will be interacting with Apache\'s JIRA instance (issues.apache.org) often.');
            console.log('(Note that you can export environment variables `JIRA_USER` and `JIRA_PASSWORD` so I won\'t ask you next time.)');
            return inquirer.prompt([{
                type: 'input',
                name: 'username',
                message: 'Please enter your JIRA username'
            }, {
                type: 'password',
                name: 'password',
                message: 'Please enter your JIRA password'
            }]);
        }
    }).then(function (answers) {
        var username = answers.username;
        you = username;
        var password = answers.password;
        jira = new jira_client({ // eslint-disable-line new-cap
            protocol: 'https',
            host: 'issues.apache.org',
            base: 'jira',
            apiVersion: '2',
            strictSSL: true,
            username: username,
            password: password
        });
        return jira.getCurrentUser();
    }).then(function (user) {
        jira_user = user;
        you = user.displayName || you; // either use JIRA display name, or username
        console.log('Hey', you, '!');
        console.log('Welcome. Let me pull some data from JIRA first...');
        return jira.listProjects();
    }).then(function (projects) {
        // Find the Apache Cordova (CB) project in Apache's JIRA
        for (var i = 0; i < projects.length; i++) {
            var project = projects[i];
            if (project.key === 'CB') {
                cordova_project = project;
                break;
            }
        }
        return jira.listComponents('CB');
    }).then(function (components) {
        // Find the ALlPlugins component in Cordova'a JIRA components
        for (var i = 0; i < components.length; i++) {
            var component = components[i];
            if (component.name === 'AllPlugins') {
                all_plugins_component = component;
                break;
            }
        }
        return jira.listIssueTypes();
    }).then(function (issue_types) {
        jira_issue_types = issue_types;
        for (var i = 0; i < issue_types.length; i++) {
            var it = issue_types[i];
            if (it.name === 'Task') {
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
        }).then(function (answer) {
            if (answer.gpg) {
                console.log('Great! Let\'s keep going.');
                return inquirer.prompt({
                    type: 'confirm',
                    name: 'discuss',
                    message: 'Did you start a "[DISCUSS] Plugins release" thread on the Cordova mailing list?'
                });
            } else {
                console.error('You should get your GPG keys sorted out first!');
                console.warn('Follow the instructions here, then come back and try again: ' + create_archive.GPG_DOCS);
                process.exit(2);
            }
        }).then(function (answer) {
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
        }).then(function (answer) {
            /* 4. Ask for JIRA issue, or, Create JIRA issue; check docs/plugins-release-process.md for details
             *   - lets refer to this JIRA issue as $JIRA from here on out.
             *   - TODO: BONUS: COMMENT to this JIRA issue for each "top-level" step below that is completed.
             */
            if (answer.jira) {
                return inquirer.prompt({
                    type: 'input',
                    name: 'jira',
                    message: 'What is the JIRA issue number for your plugins release? Please provide only the numerical part of the issue key (i.e. CB-XXXXX)'
                }).then(function (answers) {
                    var cb_issue = 'CB-' + answers.jira;
                    console.log('Looking for ' + cb_issue + '...');
                    return jira.findIssue(cb_issue).then(function (issue) {
                        return issue;
                    }, function (err) { // eslint-disable-line handle-callback-err
                        console.error('Error finding issue ' + cb_issue + '!');
                        process.exit(4);
                    });
                });
            } else {
                console.warn('OK, no problem. I will create one for you now! Hang tight...');
                var date = (new Date()).toDateString();
                var new_issue = {
                    fields: {
                        project: {
                            id: cordova_project.id
                        },
                        summary: 'Plugins Release, ' + date,
                        description: 'Following steps at https://github.com/apache/cordova-coho/blob/master/docs/plugins-release-process.md\nGenerated automatically using cordova-coho.',
                        assignee: {
                            name: jira_user.name
                        },
                        issuetype: {
                            id: jira_task_issue.id
                        },
                        components: [
                            {
                                id: all_plugins_component.id
                            }
                        ]
                    }
                };
                return jira.addNewIssue(new_issue).then(function (issue) {
                    return issue;
                }, function (err) {
                    console.error('There was a problem creating the JIRA issue!', err);
                    process.exit(5);
                });
            }
        }).then(function (jira_issue) {
            console.log('Sweet, our Plugins Release JIRA issue is ' + jira_issue.key + ' (https://issues.apache.org/jira/browse/' + jira_issue.key + ')!');
            plugins_release_issue = jira_issue;
        }).then(function () {
            /* 5: update the repos. ask the RM if they want to create a new set of repos, or use an existing directory */
            return inquirer.prompt([{
                type: 'confirm',
                name: 'use_existing_plugins',
                message: 'Do you want to use an existing set of plugin repositories? WARNING: If no, I will ask for a directory where I will clone all the needed repositories.'
            }, {
                type: 'input',
                name: 'cwd',
                default: apputil.getBaseDir(),
                message: function (answers) {
                    if (answers.use_existing_plugins) {
                        return 'We need to update the plugin and apache SVN repositories. Enter the directory containing all of your Apache Cordova source code repositories (absolute or relative paths work here)';
                    } else {
                        return 'Please enter the directory you want to house the plugin repos we will work with. This directory will be created if it does not exist.';
                    }
                }
            }, {
                type: 'confirm',
                name: 'auto_detect',
                message: 'Do you want me to try to auto-detect which plugins could use releases? If not, you will need to manually select which plugins you want to release. WARNING: if you use auto-detection along with the "clone-all-repos" option, you will be cloning a loooooong time.'
            }, {
                type: 'confirm',
                name: 'ok',
                message: function (answers) {
                    return 'WARNING! Are you sure the following directory is where you want the plugin repositories we will be working with to be located? We will be cloning/updating repos here: ' + path.resolve(path.normalize(answers.cwd));
                }
            }]);
        }).then(function (answers) {
            if (answers.ok) {
                plugin_base = path.resolve(path.normalize(answers.cwd));
                shelljs.mkdir('-p', plugin_base);
                process.chdir(plugin_base);
                plugin_repos = flagutil.computeReposFromFlag('active-plugins', { includeSvn: true });
                dist_svn = flagutil.computeReposFromFlag('dist', { includeSvn: true });
                dist_dev_svn = flagutil.computeReposFromFlag('dist/dev', { includeSvn: true });
                svn_repos = dist_svn.concat(dist_dev_svn);
                dist_svn = dist_svn[0];
                dist_dev_svn = dist_dev_svn[0];
                if (answers.auto_detect) {
                    return co.wrap(function * () {
                        yield updateDesiredRepos(plugin_repos);
                        return inquirer.prompt({
                            type: 'confirm',
                            name: 'plugins_ok',
                            message: 'I\'ve detected ' + plugins_to_release.length + ' plugin' + (plugins_to_release.length === 1 ? '' : 's') + ' to release: ' + plugins_to_release.join(', ') + '\nThat means we\'re skipping ' + plugins_ommitted.length + ' plugin' + (plugins_ommitted.length === 1 ? '' : 's') + ': ' + plugins_ommitted.join(', ') + '\nDo you want to proceed with the release process around the specified plugins above (and ommitting the ones specified as well)?'
                        }).then(function (answers) {
                            if (answers.plugins_ok) {
                                return plugins_to_release;
                            } else {
                                return manualPluginSelection();
                            }
                        });
                    })();
                } else {
                    // No auto-detection, manually specified list of plugins.
                    return manualPluginSelection();
                }
            } else {
                console.warn('Womp womp, try again? Probably this flow should be better eh?');
                process.exit(6);
            }
        }).then(function (plugins_list) {
            // at this point we either have a verified, or manually-specified, list of plugins to release.
            plugins_to_release = plugins_list;
            // modify the coho-formatted list of plugin repos to filter out to only the plugins we want to release.
            plugin_repos = plugin_repos.filter(function (plugin) {
                return plugins_to_release.indexOf(plugin.repoName) > -1;
            });
            return co.wrap(function * () {
                yield updateDesiredRepos(plugin_repos);
                // and remove all the data we collected for plugins we no longer care about.
                var data_keys = Object.keys(plugin_data);
                data_keys.forEach(function (key) {
                    if (plugins_to_release.indexOf(key) === -1) {
                        delete plugin_data[key];
                    }
                });
                /* 7. ensure license headers are present everywhere. */
                console.log('Checking license headers for specified plugin repos...');
                var unknown_licenses = [];
                yield audit_license.scrubRepos(plugin_repos, /* silent */true, /* allowError */false, function (repo, stdout) {
                    var unknown = stdout.split('\n').filter(function (line) {
                        return line.indexOf('Unknown Licenses') > -1;
                    })[0];
                    if (unknown[0] !== '0') {
                        // There are some unknown licenses!
                        unknown_licenses.push({ repo: repo.repoName, unknown: unknown });
                    }
                });
                return yield Promise.resolve(unknown_licenses);
            })();
        }).then(function (unknowns) {
            if (unknowns.length) {
                console.warn('We identified some unknown licenses in plugin repos!');
                console.warn(unknowns);
                return inquirer.prompt({
                    type: 'confirm',
                    name: 'proceed',
                    message: 'Do you want to proceed even though there are license problems?'
                }).then(function (answer) {
                    if (!answer.proceed) {
                        console.error('License audit failed - good idea to abort. Fix it up and come back!');
                        process.exit(7);
                    }
                });
            } else {
                console.log('No license issues found - continuing.');
            }
        }).then(function () {
            return inquirer.prompt({
                type: 'confirm',
                name: 'proceed',
                message: 'We are now ready to start making changes to the selected plugin repo, which will make changes to the master and release branches. Shall we proceed?'
            }).then(function (answers) {
                if (!answers.proceed) {
                    console.error('Bailing!');
                    process.exit(99);
                }
            });
        }).then(function () {
            // TODO: step 8 apparently is "rarely" done based on fil's experience running through the plugin release steps manually.
            // soooo.... what do?
            /* 8. ensure all dependencies and subdependencies have apache-compatible licenses.
             * 9. update plugin versions + release notes.
             *   - for each plugin, remove the `-dev` suffix in plugin.xml, package.json, and plugin.xml of `tests/` subdirectory (if exists) */
            console.log('Removing the "-dev" suffix from versions in the master branch...');
            return co.wrap(function * () {
                yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                    yield gitutil.gitCheckout('master');
                    var current_version = yield versionutil.getRepoVersion(repo);
                    console.log(repo.repoName, '\'s current version is', current_version);
                    var devless_version = versionutil.removeDev(current_version);
                    plugin_data[repo.repoName].current_release = devless_version;
                    yield versionutil.updateRepoVersion(repo, devless_version, { commitChanges: false });
                });
            })();
        }).then(function () {
            /*   - each plugin may need a version bump.
             *     - how to determine if patch, minor or major? show changes to each plugin and then prompt Release Manager for a decision?
             *     - reuse coho 'update release notes' command */
            return co.wrap(function * () {
                var plugs = Object.keys(plugin_data);
                var release_note_prompts = [];
                yield plugs.map(function * (plugin) {
                    var data = plugin_data[plugin];
                    var changes = data.changes;
                    var final_notes = yield update_release_notes.createNotes(plugin, data.current_release, changes);
                    release_note_prompts.push({
                        type: 'editor',
                        name: plugin,
                        message: 'Please tweak and compile ' + plugin + ' release notes',
                        default: final_notes
                    });
                    /*     - what's the average case? just a patch bump? perhaps, for each plugin, show release notes and let RM override version beyond patch bump if RM believes it is necessary? */
                    release_note_prompts.push({
                        type: 'input',
                        name: plugin + '-version',
                        message: function (answers) {
                            var new_changes = answers[plugin];
                            var first_heading = new_changes.indexOf('###');
                            var second_heading = new_changes.indexOf('###', first_heading + 3);
                            var first_change = new_changes.indexOf('\n', first_heading + 3);
                            var len = second_heading - first_change;
                            var change_summary = new_changes.substr(first_change, len);
                            return 'Please enter a semver-compatible version number for this release of ' + plugin + ', based on the changes below:\n' + change_summary;
                        },
                        default: data.current_release,
                        validate: function (input) {
                            if (semver.valid(input)) {
                                return true;
                            } else {
                                return 'That\'s not a valid semver version!';
                            }
                        }
                    });
                });
                return inquirer.prompt(release_note_prompts);
            })();
        }).then(function (release_notes) {
            return co.wrap(function * () {
                console.log('Writing out new release notes and plugin versions (if applicable)...');
                yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                    var plugin_name = repo.repoName;
                    if (plugin_data[plugin_name].current_release !== release_notes[plugin_name + '-version']) {
                        // If, after release notes review, RM decided on a different version...
                        // Overwrite plugin version
                        var previous_assumed_version = plugin_data[plugin_name].current_release;
                        plugin_data[plugin_name].current_release = release_notes[plugin_name + '-version'];
                        yield versionutil.updateRepoVersion(repo, plugin_data[plugin_name].current_release, { commitChanges: false });
                        // also overwrite the version originally specified in the release notes file, since we changed it now!
                        var rn = release_notes[plugin_name];
                        var new_rn = rn.replace(new RegExp('### ' + previous_assumed_version, 'g'), '### ' + plugin_data[plugin_name].current_release);
                        release_notes[plugin_name] = new_rn;
                    }
                    fs.writeFileSync(update_release_notes.FILE, release_notes[plugin_name], { encoding: 'utf8' });
                    /* - commit changes to versions and release notes together with description '$JIRA Updated version and release notes for release $v'
                     * - tag each plugin repo with $v */
                    if (yield gitutil.pendingChangesExist()) {
                        yield gitutil.commitChanges(plugins_release_issue.key + ' Updated version and RELEASENOTES.md for release ' + plugin_data[plugin_name].current_release + ' (via coho)');
                        yield gitutil.tagRepo(plugin_data[plugin_name].current_release);
                    } else {
                        console.warn('No pending changes detected for ' + plugin_name + '; that\'s probably not good eh?');
                    }
                });
            })();
        }).then(function () {
            /* 10. Create release branch. Check if release branch, which would be named in the form "major.minor.x" (i.e. 2.3.x) already exists */
            return co.wrap(function * () {
                var repos_with_existing_release_branch = [];
                yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                    var plugin_name = repo.repoName;
                    var plugin_version = plugin_data[plugin_name].current_release;
                    var release_branch_name = versionutil.getReleaseBranchNameFromVersion(plugin_version);
                    if (yield gitutil.remoteBranchExists(repo, release_branch_name)) {
                        repos_with_existing_release_branch.push(repo);
                        // also store HEAD of release branch, so later on we can show a diff of the branch before pushing
                        plugin_data[plugin_name].previous_release_branch_head = gitutil.hashForRef(release_branch_name);
                        console.log('Release branch', release_branch_name, 'already exists, time to update it. We will be making changes to this existing branch.');
                        yield repoupdate.updateRepos([repo], [release_branch_name], /* noFetch */false);
                    } else {
                        yield gitutil.createNewBranch(release_branch_name);
                        console.log('Created branch', release_branch_name, 'in repo', plugin_name);
                    }
                });
                return repos_with_existing_release_branch;
            })();
        }).then(function (repos_with_existing_release_branch) {
            // Here we are passed an array of repos that already had release branches created prior to starting the release process.
            // Our mission in this clause, should we choose to accept it, is to merge master back into the branch. But, this can be dangerous!
            // Ask the RM if they want us to handle the merge automatically.
            // If the RM says no, we will prompt them to handle it manually later.
            var prompts = [];
            repos_with_existing_release_branch.forEach(function (repo) {
                var plugin_name = repo.repoName;
                var rb = versionutil.getReleaseBranchNameFromVersion(plugin_data[plugin_name].current_release);
                prompts.push({
                    type: 'confirm',
                    name: 'rb_automerge_proceed_' + plugin_name,
                    message: plugin_name + ' already has an existing release branch "' + rb + '". Do you want me to automatically merge master into this branch for you? If no, I will prompt you to modify the release branch yourself at a later time in this session.\nWARNING: this will run `git merge master -s recursive -X theirs` from the release branch, essentially favouring master branch changes. Only proceed with the auto-merge if you understand the repercussions of doing so.'
                });
            });
            return inquirer.prompt(prompts);
        }).then(function (answers) {
            return co.wrap(function * () {
                var prompts = [];
                yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                    var plugin_name = repo.repoName;
                    if (answers['rb_automerge_proceed_' + plugin_name]) {
                        // Auto-merge master into the release branch.
                        var rb = versionutil.getReleaseBranchNameFromVersion(plugin_data[plugin_name].current_release);
                        console.log('Checking out "' + rb + '" branch of', plugin_name, 'and merging master in...');
                        yield executil.execHelper(executil.ARGS('git merge -s recursive -X theirs', 'master'), false, false, function () {
                            console.log('Merge was fine, continuing.');
                        }, function (e) {
                        // yield gitutil.merge('master', function() { console.log('merge was fine, continuing.'); }, function(e) {
                            plugins_to_merge_manually.push(plugin_name);
                        });
                    } else {
                        plugins_to_merge_manually.push(plugin_name);
                    }
                });
                return inquirer.prompt(prompts);
            })();
        }).then(function () {
            // prompt the RM about the plugins with manual merging work needed here.
            var prompts = [];
            plugins_to_merge_manually.forEach(function (plugin_name) {
                var rb = versionutil.getReleaseBranchNameFromVersion(plugin_data[plugin_name].current_release);
                prompts.push({
                    type: 'confirm',
                    name: 'rb_manualmerge_proceed_' + plugin_name,
                    message: plugin_name + ' already has an existing release branch "' + rb + '", and it needs a manual merge of master into it (either because you specified that, or because there was a merge conflict during auto-merge. Now is your chance to manually merge / cherry-pick / resolve conflicts on the "' + rb + '" branch. Once you have done this (probably in a separate shell or command prompt), hit Enter to continue.'
                });
            });
            return inquirer.prompt(prompts);
        }).then(function () {
            /* 11. Increment plugin versions back on the master branch to include -dev */
            // Also increment the patch version
            // So, check out master branch and do the thing.
            return co.wrap(function * () {
                yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                    var plugin_name = repo.repoName;
                    var newest_version = semver.inc(plugin_data[plugin_name].current_release, 'patch') + '-dev';
                    console.log('Checking out master branch of', plugin_name, 'and setting version to', newest_version, ', then committing that change to master branch...');
                    yield gitutil.gitCheckout('master');
                    // store previous master HEAD, for later comparison/showing of diff
                    plugin_data[plugin_name].previous_master_head = gitutil.hashForRef('master');
                    yield versionutil.updateRepoVersion(repo, newest_version, { commitChanges: true });
                });
            })();
        }).then(function () {
            /* 12. Push tags, release branch, and master branch changes.
             * start with pushing tag, then compile diffs for master branch push and ask user if they approve before pushing master */
            return co.wrap(function * () {
                var master_prompts = [];
                yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                    var plugin_name = repo.repoName;
                    var tag = plugin_data[plugin_name].current_release;
                    console.log(plugin_name, ': pushing tag ', tag);
                    yield gitutil.pushToOrigin(tag);
                    /*   - show diff of last master commit for user confirmation */
                    var diff = yield gitutil.diff(plugin_data[plugin_name].previous_master_head, 'master');
                    master_prompts.push({
                        type: 'confirm',
                        name: 'master_' + plugin_name,
                        message: 'About to push the following changes to the master branch of ' + plugin_name + ': ' + diff + '\nDo you wish to continue?'
                    });
                });
                return inquirer.prompt(master_prompts);
            })();
        }).then(function (answers) {
            /* check confirmations and exit if RM bailed */
            return co.wrap(function * () {
                yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                    var plugin_name = repo.repoName;
                    if (!answers['master_' + plugin_name]) {
                        console.error('Aborting as master branch changes for ' + plugin_name + ' were not approved!');
                        process.exit(8);
                    }
                });
            })();
        }).then(function () {
            // at this point RM is cool pushing master branch changes up.
            return co.wrap(function * () {
                yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                    // at this point still have master branch checked out
                    yield gitutil.pushToOrigin('master');
                });
            })();
        }).then(function () {
            /*   - show diff of release branch:
            *     - if release branch did not exist before, show diff (simple, just master..branch), confirm, then push
            *     - if release branch did exist before, show diff (last branch commit..HEAD), confirm, then push */
            return co.wrap(function * () {
                var rb_prompts = [];
                yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                    var plugin_name = repo.repoName;
                    var plugin_version = plugin_data[plugin_name].current_release;
                    var release_branch_name = versionutil.getReleaseBranchNameFromVersion(plugin_version);
                    var previous_release_branch_head = plugin_data[plugin_name].previous_release_branch_head;
                    yield gitutil.gitCheckout(release_branch_name);
                    if (previous_release_branch_head) {
                        // release branch previously existed.
                        const diff = yield gitutil.diff(previous_release_branch_head, 'HEAD');
                        rb_prompts.push({
                            type: 'confirm',
                            name: 'rb_' + plugin_name,
                            message: 'About to push the following changes to the EXISTING release branch (' + release_branch_name + ') of ' + plugin_name + ': ' + diff + '\nDo you wish to continue?'
                        });
                    } else {
                        // release branch did NOT exist previously, this is a new release branch.
                        const diff = yield gitutil.diff('master', release_branch_name);
                        rb_prompts.push({
                            type: 'confirm',
                            name: 'rb_' + plugin_name,
                            message: 'About to push the following changes (compared to master) to the NEW release branch (' + release_branch_name + ') of ' + plugin_name + ': ' + diff + '\nDo you wish to continue?'
                        });
                    }
                });
                return inquirer.prompt(rb_prompts);
            })();
        }).then(function (answers) {
            /* check confirmations and exit if RM bailed */
            return co.wrap(function * () {
                yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                    var plugin_name = repo.repoName;
                    if (!answers['rb_' + plugin_name]) {
                        console.error('Aborting as release branch changes for ' + plugin_name + ' were not approved!');
                        process.exit(8);
                    }
                });
            })();
        }).then(function () {
            // at this point RM is cool pushing master branch changes up.
            return co.wrap(function * () {
                yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                    var plugin_name = repo.repoName;
                    var plugin_version = plugin_data[plugin_name].current_release;
                    var release_branch_name = versionutil.getReleaseBranchNameFromVersion(plugin_version);
                    // at this point have release branch checked out
                    yield gitutil.pushToOrigin(release_branch_name);
                });
            })();
        }).then(function () {
            // 13. Publish to apache svn:
            // - first update dist-dev repo
            return co.wrap(function * () {
                var orig_dir = process.cwd();
                var dist_dev_repo = path.join(plugin_base, dist_dev_svn.repoName);
                process.chdir(dist_dev_repo);
                console.log('Updating dist-dev svn repo...');
                yield svnutil.update();
                process.chdir(orig_dir);
            })();
        }).then(function () {
            //   - create-archive -r $ACTIVE --dest cordova-dist-dev/$JIRA
            return co.wrap(function * () {
                // location to store the archives in.
                var dist_dev_dir = path.join(plugin_base, dist_dev_svn.repoName, plugins_release_issue.key);
                if (!(fs.existsSync(dist_dev_dir))) {
                    shelljs.mkdir('-p', dist_dev_dir);
                    created_distdev_dir = true;
                }
                yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                    var plugin_name = repo.repoName;
                    var tag = plugin_data[plugin_name].current_release;
                    yield gitutil.gitCheckout(tag);
                    var archive = yield create_archive.createArchive(repo, tag, dist_dev_dir, true/* sign */);
                    // - verify-archive cordova-dist-dev/$JIRA/*.tgz
                    yield create_archive.verifyArchive(archive);
                    yield gitutil.gitCheckout('master');
                });
            })();
        }).then(function () {
            if (process.env.SVN_USER && process.env.SVN_PASSWORD) {
                return {
                    username: process.env.SVN_USER,
                    password: process.env.SVN_PASSWORD
                };
            } else {
                console.log('We are about to push changes up to Apache SVN! Let me get your SVN credentials.');
                console.log('(For next time, you can export the `SVN_USER` and `SVN_PASSWORD` environment variables to skip me asking you.)');
                return inquirer.prompt([{
                    type: 'input',
                    name: 'username',
                    message: 'Please enter your svn username'
                }, {
                    type: 'password',
                    name: 'password',
                    message: 'Please enter your svn password'
                }]);
            }
        }).then(function (answers) {
            svn_user = answers.username;
            svn_password = answers.password;
            //   - upload by running `svn` add and commit commands.
            return co.wrap(function * () {
                var orig_dir = process.cwd();
                var dist_dev_repo = path.join(plugin_base, dist_dev_svn.repoName);
                if (created_distdev_dir) {
                    // if we created the dir containing the archives, then we can
                    // just svn add the entire dir.
                    process.chdir(dist_dev_repo);
                    yield svnutil.add(plugins_release_issue.key);
                    yield svnutil.commit(svn_user, svn_password, plugins_release_issue.key + ': Uploading release candidates for plugins release');
                } else {
                    // if it already existed, then we need to painstakingly add
                    // each individual archive file cause svn is cool
                    var archives_for_plugins = [];
                    yield repoutil.forEachRepo(plugin_repos, function * (repo) {
                        process.chdir(dist_dev_repo);
                        var plugin_name = repo.repoName;
                        var tag = plugin_data[plugin_name].current_release;
                        var fileref = plugin_name + '-' + tag;
                        archives_for_plugins.push(fileref);
                        var files_to_add = glob.sync(path.join(plugins_release_issue.key, fileref + '*'));
                        for (var i = 0; i < files_to_add.length; i++) {
                            yield svnutil.add(files_to_add[i]);
                        }
                    });
                    process.chdir(dist_dev_repo);
                    yield svnutil.commit(svn_user, svn_password, plugins_release_issue.key + ': Uploading release candidates for plugins ' + archives_for_plugins.join(', '));
                }

                process.chdir(orig_dir);
            })();
        }).then(function () {
            console.log('Nicely done! Last few things you should do:');
            /* 14. Dump instructions only? Prepare blog post - perhaps can dump out release notes-based blog content.
             *   - TODO: this apparently ends up as a .md file in cordova-docs. perhaps can dump this as a shell of a file into the cordova-docs repo? maybe even auto-branch the docs repo in prep for a PR? */
            console.log('1. Prepare a blog post: https://github.com/apache/cordova-coho/blob/master/docs/plugins-release-process.md#prepare-blog-post');
            console.log('2. Start a vote thread! https://github.com/apache/cordova-coho/blob/master/docs/plugins-release-process.md#start-vote-thread');
            console.log('3. You should test these plugins out! Check out cordova-mobile-spec, and in particular, the `createmobilespec` script that comes with it - it\'s a quick way to create a test project with all plugins included.');
            process.exit(0);
        });
    }, function (auth_err) {
        var keys = Object.keys(auth_err); // eslint-disable-line no-unused-vars
        console.error('ERROR! There was a problem connecting to JIRA, received a', auth_err.statusCode, 'status code.');
        process.exit(1);
    });
    /* 16. Bonus: separate script to 'approve' a plugins release, which would:
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
function * handleVersion (repo, ver, validate) { // eslint-disable-line no-unused-vars
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
