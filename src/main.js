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

try {
    var co = require('co');
    var optimist = require('optimist');
} catch (e) {
    console.log('Please run "npm install" from this directory:\n\t' + __dirname);
    process.exit(2);
}

module.exports = function() {
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
            entryPoint: require('./repo-push')
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
            entryPoint: require('./cadance-release').prepareReleaseBranchCommand
        }, {
            name: 'tag-release',
            desc: 'Tags repos for a release.',
            entryPoint: require('./cadance-release').tagReleaseBranchCommand
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
