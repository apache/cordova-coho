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

// Verify that npm install was run before importing anything else
require('./check-npm-install-util');

const co = require('co');
const optimist = require('optimist');

const executil = require('./executil');
const apputil = require('./apputil');

const lazyRequire = require('./lazy-require-util');

module.exports = function () {
    const repoCommands = [
        {
            name: 'repo-clone',
            desc: 'Clones git repositories as siblings of cordova-coho (unless --no-chdir or --global is used).',
            entryPoint: lazyRequire('./repo-clone')
        }, {
            name: 'repo-update',
            desc: 'Performs git pull --rebase on all specified repositories.',
            entryPoint: lazyRequire('./repo-update')
        }, {
            name: 'repo-reset',
            desc: 'Performs git reset --hard origin/$BRANCH and git clean -f -d on all specified repositories.',
            entryPoint: lazyRequire('./repo-reset')
        }, {
            name: 'repo-status',
            desc: 'Lists changes that exist locally but have not yet been pushed.',
            entryPoint: lazyRequire('./repo-status')
        }, {
            name: 'repo-push',
            desc: 'Push changes that exist locally but have not yet been pushed.',
            entryPoint: lazyRequire('./repo-push')
        }, {
            name: 'list-repos',
            desc: 'Shows a list of valid values for the --repo flag.',
            entryPoint: lazyRequire('./list-repos')
        }, {
            name: 'remote-update',
            desc: 'Update specified git remote to point to corresponding apache github repo',
            entryPoint: lazyRequire('./remote-update')
        }];

    const releaseCommands = [{
        name: 'prepare-platform-release-branch',
        desc: 'Branches, updates JS, updates VERSION. Safe to run multiple times.',
        entryPoint: lazyRequire('./platform-release', 'prepareReleaseBranchCommand')
    }, {
        name: 'tag-platform-release',
        desc: 'Tags repos for a release.',
        entryPoint: lazyRequire('./platform-release', 'tagReleaseBranchCommand')
    }, {
        name: 'audit-license-headers',
        desc: 'Uses Apache RAT to look for missing license headers.',
        entryPoint: lazyRequire('./audit-license-headers')
    }, {
        name: 'check-license',
        desc: 'Go through each specified repo and check the licenses of node modules that are 3rd-party dependencies.',
        entryPoint: lazyRequire('./check-license')
    }, {
        name: 'create-archive',
        desc: 'Zips up a tag, signs it, and adds checksum files.',
        entryPoint: lazyRequire('./create-verify-archive', 'createCommand')
    }, {
        name: 'verify-archive',
        desc: 'Checks that archives are properly signed and hashed.',
        entryPoint: lazyRequire('./create-verify-archive', 'verifyCommand')
    }, {
        name: 'print-tags',
        desc: 'Prints out tags & hashes for the given repos. Used in VOTE emails.',
        entryPoint: lazyRequire('./print-tags')
    }, {
        name: 'verify-tags',
        desc: 'Verify the tags match the hashes within VOTE emails.',
        entryPoint: lazyRequire('./verify-tags')
    }, {
        name: 'list-release-urls',
        desc: 'List the apache git repo urls for release artifacts.',
        entryPoint: lazyRequire('./list-release-urls')
    }, {
        name: 'nightly',
        desc: 'Builds and publishes nightly builds of cordova-cli using the latest commits for each platform.',
        entryPoint: lazyRequire('./nightly')
    }, {
        name: 'prepare-tools-release',
        desc: 'Prepares tools for release',
        entryPoint: lazyRequire('./tools-release', 'prepareToolsRelease')
    }, {
        name: 'prepare-plugins-release',
        desc: 'Prepares plugins for release',
        entryPoint: lazyRequire('./plugin-release', 'interactive')
    }, {
        name: 'npm-publish-tag',
        desc: 'Publishes current version of repo to specified tag',
        entryPoint: lazyRequire('./npm-publish', 'publishTag')
    }, {
        name: 'update-release-notes',
        desc: 'Updates release notes with commits since the most recent tag.',
        entryPoint: lazyRequire('./update-release-notes')
    }, {
        name: 'npm-unpublish-nightly',
        desc: 'Unpublishes last nightly versions for all specified repositories',
        entryPoint: lazyRequire('./npm-publish', 'unpublishNightly')
    }];

    const otherCommands = [{
        name: 'list-pulls',
        desc: 'Shows a list of GitHub pull requests for all specified repositories.',
        entryPoint: lazyRequire('./list-pulls')
    }, {
        name: 'merge-pr',
        desc: 'Merges specified PR',
        entryPoint: lazyRequire('./merge-pr'),
        noChdir: true
    }, {
        name: 'create-pr',
        desc: 'Launches github PR UI for the specified topic branch',
        entryPoint: lazyRequire('./create-pr'),
        noChdir: true
    }, {
        name: 'last-week',
        desc: 'Prints out git logs of things that happened last week.',
        entryPoint: lazyRequire('./last-week')
    }, {
        name: 'shortlog',
        desc: 'A version of `git shortlog -s` aggregated across multiple repos.',
        entryPoint: lazyRequire('./shortlog')
    }, {
        name: 'for-each',
        desc: 'Runs a shell command in each repo.',
        entryPoint: lazyRequire('./for-each')
    }, {
        name: 'npm-link',
        desc: 'Does an "npm link" of dependent modules that we own.',
        entryPoint: lazyRequire('./npm-link')
    }, {
        name: 'copy-js',
        desc: 'Generates and copies cordova.js to platform.',
        entryPoint: lazyRequire('./platform-release.js', 'createAndCopyCordovaJSCommand')
    }, {
        name: 'version',
        desc: 'Outputs the version of coho.',
        entryPoint: function * outputVersion () {
            console.log(require('../package').version);
            yield Promise.resolve();
        }
    }];

    const commandMap = {};
    function addToCommandMap (cmd) {
        commandMap[cmd.name] = cmd;
    }
    repoCommands.forEach(addToCommandMap);
    releaseCommands.forEach(addToCommandMap);
    otherCommands.forEach(addToCommandMap);
    // aliases:
    commandMap['foreach'] = commandMap['for-each'];

    let usage = 'Usage: $0 command [options]\n\n';
    function addCommandUsage (cmd) {
        usage += '    ' + cmd.name + ': ' + cmd.desc + '\n';
    }
    usage += 'Repo Management:\n';
    repoCommands.forEach(addCommandUsage);
    usage += '\nRelease Management:\n';
    releaseCommands.forEach(addCommandUsage);
    usage += '\nOther Commands:\n';
    otherCommands.forEach(addCommandUsage);

    usage += '\nFor help on a specific command: $0 command --help\n\n';
    usage += 'Some examples:\n';
    usage += '    ./cordova-coho/coho repo-clone -r plugins -r mobile-spec -r android -r ios -r cli\n';
    usage += '    ./cordova-coho/coho repo-update\n';
    usage += '    ./cordova-coho/coho list-pulls -r .\n';
    usage += '    ./cordova-coho/coho for-each -r plugins "git checkout master"\n';
    usage += '    ./cordova-coho/coho for-each -r plugins "git clean -fd"\n';
    usage += '    ./cordova-coho/coho last-week --me';

    const command = commandMap[optimist.argv._[0]];

    let opts = optimist
        .usage(usage)
        .options('verbose', {
            desc: 'Enable verbose logging',
            type: 'boolean',
            default: false
        })
        .options('global', {
            desc: 'Global use of coho, equivalent to --no-chdir',
            type: 'boolean',
            default: false
        })
        .alias('global', 'g');

    if (opts.argv.global) {
        if (command) {
            // if global is set, it is essentially --no-chdir
            command.noChdir = true;
        }
    }

    if (command && !command.noChdir) {
        opts = opts.options('chdir', {
            desc: 'Use --no-chdir or --global to run in your CWD instead of the parent of cordova-coho/',
            type: 'boolean',
            default: true
        });
    }

    const argv = opts.check(function (argv) {
        const commandName = argv._[0];
        if (!commandName) {
            throw 'No command specified.';
        }
        if (!command) {
            throw 'Unknown command: ' + commandName;
        }
        if (argv.r === true) {
            throw 'No repositories specified, see list-repos';
        }
    }).argv;

    if (!command.noChdir) {
        // Change directory to be a sibling of coho.
        apputil.initWorkingDir(argv.chdir);
    }

    if (argv.verbose) {
        executil.verbose = true;
    }

    const entry = command.entryPoint;
    co(entry).then();
};
