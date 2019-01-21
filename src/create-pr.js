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

var flagutil = require('./flagutil');
var optimist = require('optimist');
var executil = require('./executil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');
var REMOTE = 'https://github.com/apache/';
var apputil = require('./apputil');
var url = require('url');
var opener = require('opener');

module.exports = function * (argv) {
    var opt = flagutil.registerHelpFlag(optimist);
    opt.options('branch', {
        desc: 'Topic branch for which to create pull request (Default: current branch) ',
        demand: false
    });
    argv = opt
        .usage('Launch github URL to create PR\n' +
        '\n' +
        'Usage: $0 create-pr --branch <topic_branch>')
        .argv;
    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var currentRepo = repoutil.getRepoById(repoutil.resolveCwdRepo());
    var currentBranch = opt.branch;
    if (!currentBranch) {
        currentBranch = yield gitutil.retrieveCurrentBranchName();
    }
    if (currentBranch === 'master') {
        console.log('You can crate a PR only for a topic branch that is not master. Use --branch to specify the topic branch or checkout to the topic branch.');
    }
    var remoteInfo = yield getRemoteName(currentBranch);
    var remoteFork = yield getRemoteForkName(remoteInfo.remoteName);
    var url = REMOTE + currentRepo.repoName + '/compare/master...' + remoteFork + ':' + remoteInfo.remoteBranch + '?expand=1';
    console.log('Navigating to: ' + url);
    opener(url);
};

function * getRemoteForkName (remoteName) {
    var remotes = (yield executil.execHelper(executil.ARGS('git remote -v'), /* silent */ true)).split('\n');
    var remoteUrl;
    for (var i = 0; i < remotes.length; i++) {
        // fork    https://github.com/forkName/cordova-coho.git (push)
        var tokens = remotes[i].split(/\s+/);
        if (tokens[2] === '(push)' && tokens[0] === remoteName) {
            remoteUrl = tokens[1];
            break;
        }
    }
    if (!remoteUrl) {
        apputil.fatal('Cannot find remote Url: ' + remotes);
    }

    // 'url.parse' was deprecated since v11.0.0. Use 'url.URL' constructor instead
    var parsed = url.parse(remoteUrl); // eslint-disable-line

    // parsed => /forkName/cordova-coho.git
    var forkName = (parsed.pathname.split('/'))[1];
    return forkName;
}

function * getRemoteName (currentBranch) {
    var branches = (yield executil.execHelper(executil.ARGS('git branch -vv'), /* silent */ true)).split('\n');
    //* create-pr           3bed9b5 [remotes/fork/create-pr] Add support for launching URL to create a PR
    for (var i = 0; i < branches.length; i++) {
        //* create-pr           3bed9b5 [remotes/fork/create-pr] Add support for launching URL to create a PR
        // 0   1                    2       3
        var tokens = branches[i].split(/\s+/);
        if (tokens[0] === '*') {
            // found the current branch
            if (currentBranch !== tokens[1]) {
                apputil.fatal('Unexpected format. Cannot find remote branch: ' + tokens[1] + '!== ' + currentBranch);
            }
            // if there is no upstream remote specified - we have no choice but to bail
            var remote = tokens[3];
            if (remote.indexOf('[') !== 0) {
                apputil.fatal('Cannot determine upstream remote branch. Have you already pushed it? \n' +
                    'To push and set upstream: git push -u <remoteFork> ' + currentBranch + '\n' +
                    'To set upstream branch:   git branch --set-upstream <remoteFork>');
            }
            // Strip off the []
            remote = remote.substring(1, remote.length - 1);
            tokens = remote.split('/');
            var remoteName = tokens[0];
            var remoteBranch = tokens[1];
            if (remoteName === 'remotes') {
                remoteName = tokens[1];
                remoteBranch = tokens[2];
            }
            return { remoteName: remoteName, remoteBranch: remoteBranch };
        }
    }
    apputil.fatal('Unexpected error. Cannot determine remote: ' + branches);
}
