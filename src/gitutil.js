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
var executil = require('./executil');
var gitutil = exports;

exports.findMostRecentTag = function() {
    return executil.execHelper(executil.ARGS('git describe --tags --abbrev=0 HEAD'), true);
}

exports.tagExists = function*(tagName) {
    return !!(yield executil.execHelper(executil.ARGS('git tag --list ' + tagName), true));
}

exports.retrieveCurrentBranchName = function*(allowDetached) {
    var ref = yield executil.execHelper(executil.ARGS('git symbolic-ref HEAD'), true, true);
    if (!ref) {
        if (allowDetached) {
            return null;
        }
        throw new Error('Aborted due to repo ' + shjs.pwd() + ' not being on a named branch');
    }
    var match = /refs\/heads\/(.*)/.exec(ref);
    if (!match) {
        throw new Error('Could not parse branch name from: ' + ref);
    }
    return match[1];
}

exports.remoteBranchExists = function*(repo, name) {
    return !!(yield executil.execHelper(executil.ARGS('git branch -r --list ' + repo.remoteName + '/' + name), true));
}

exports.stashAndPop = function*(repo, func) {
    var requiresStash = yield gitutil.pendingChangesExist();
    var branchName = yield gitutil.retrieveCurrentBranchName();

    if (requiresStash) {
        yield executil.execHelper(executil.ARGS('git stash save --all --quiet', 'coho stash'));
    }

    yield func();

    yield gitutil.gitCheckout(branchName);
    if (requiresStash) {
        yield executil.execHelper(executil.ARGS('git stash pop'));
    }
}

exports.pendingChangesExist = function*() {
    return !!(yield executil.execHelper(executil.ARGS('git status --porcelain'), true));
}

exports.gitCheckout = function*(branchName) {
    var curBranch = yield gitutil.retrieveCurrentBranchName(true);
    if (curBranch != branchName) {
        return yield executil.execHelper(executil.ARGS('git checkout -q ', branchName));
    }
}

exports.localBranchExists = function*(name) {
    return !!(yield executil.execHelper(executil.ARGS('git branch --list ' + name), true));
}

