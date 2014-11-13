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
try {
    var co = require('co');
    var optimist = require('optimist');
    // Ensure npm install has been run.
    Object.keys(require('../package').dependencies).forEach(require);
} catch (e) {
    console.log('Please run "npm install" from this directory:\n\t' + __dirname);
    process.exit(2);
}
var apputil = require('./apputil');

function *lazyRequire(name, opt_prop) {
    if (opt_prop) {
        yield require(name)[opt_prop];
    } else {
        yield require(name);
    }
}

module.exports = function() {
    var repoCommands = [
        {
            name: 'repo-clone',
            desc: 'Clones git repositories into the current working directory.',
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
        }];
    var releaseCommands = [{
            name: 'prepare-release-branch',
            desc: 'Branches, updates JS, updates VERSION. Safe to run multiple times.',
            entryPoint: lazyRequire('./platform-release', 'prepareReleaseBranchCommand')
        }, {
            name: 'tag-release',
            desc: 'Tags repos for a release.',
            entryPoint: lazyRequire('./platform-release', 'tagReleaseBranchCommand')
        }, {
            name: 'audit-license-headers',
            desc: 'Uses Apache RAT to look for missing license headers.',
            entryPoint: lazyRequire('./audit-license-headers')
        }, {
            name: 'create-release-bug',
            desc: 'Creates a bug in JIRA for tracking the tasks involved in a new release',
            entryPoint: lazyRequire('./create-release-bug')
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
        }];
    var otherCommands = [{
            name: 'list-pulls',
            desc: 'Shows a list of GitHub pull requests for all specified repositories.',
            entryPoint: lazyRequire('./list-pulls')
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
            name: 'check-license',
            desc: 'Go through each specified repo and check the licenses of node modules that are 3rd-party dependencies.',
            entryPoint: lazyRequire('./check-license')
        }, {
            name: 'nightly',
            desc: 'Builds and publishes nightly builds of cordova-cli using the latest commits for each platform.',
            entryPoint: lazyRequire('./nightly')
        }, {
            name: 'prepare-tools-release',
            desc: 'Prepares tools for release',
            entryPoint: lazyRequire('./tools-release', 'prepareToolsRelease')
        }, {
            name: 'npm-publish-tag',
            desc: 'Publishes current version of repo to specified tag',
            entryPoint: lazyRequire('./npm-publish', 'publishTag')
        }
    ];
    var commandMap = {};
    function addToCommandMap(cmd) {
        commandMap[cmd.name] = cmd;
    }
    repoCommands.forEach(addToCommandMap);
    releaseCommands.forEach(addToCommandMap);
    otherCommands.forEach(addToCommandMap);
    // aliases:
    commandMap['foreach'] = commandMap['for-each'];

    var usage = 'Usage: $0 command [options]\n\n';
    function addCommandUsage(cmd) {
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
    usage += '    ./cordova-coho/coho for-each -r plugins "git checkout master"\n';
    usage += '    ./cordova-coho/coho for-each -r plugins "git clean -fd"\n';
    usage += '    ./cordova-coho/coho last-week --me';

    var command;
    var argv = optimist
        .usage(usage)
        .options('chdir', {
            desc: 'Use --no-chdir to run in your CWD instead of the parent of cordova-coho/',
            type: 'boolean',
            default: true
         })
        .check(function(argv) {
            command = argv._[0];
            if (!command) {
                throw 'No command specified.';
            }
            if (!commandMap[command]) {
                throw 'Unknown command: ' + command;
            }
            if (argv.r === true) {
                throw 'No repositories specified, see list-repos';
            }
        }).argv;

    // Change directory to be a sibling of coho.
    apputil.initWorkingDir(argv.chdir);

    var entry = commandMap[command].entryPoint;
    co(entry)();
};
