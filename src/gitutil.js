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
var semver = require('semver');

exports.findMostRecentTag = function*() {
    // Returns the greatest semver-looking tag in the repo
    return (yield executil.execHelper(executil.ARGS('git tag --list'), true)).split(/\s+/)
    .reduce(function(curBest, value) {
        // Strip the "r" prefix that plugin repos use (ugh), but also make them look higher than 3.0.0 tag that exists
        var modifiedCurBest = curBest.replace(/^r/, '9');
        var modifiedValue = value.replace(/^r/, '9');
        if (semver.valid(modifiedValue)) {
            return !curBest ? modifiedValue : semver.gt(modifiedCurBest, modifiedValue) ? curBest : value;
        } else if (curBest && semver.valid(modifiedCurBest)) {
            return curBest;
        }
        return null;
    });
}

exports.tagExists = function*(tagName) {
    return !!(yield executil.execHelper(executil.ARGS('git tag --list ' + tagName), true));
}

exports.retrieveCurrentBranchName = function*(allowDetached) {
    var ref;
    try {
        ref = yield executil.execHelper(executil.ARGS('git symbolic-ref HEAD'), true, true);
    } catch (e) {
        if (allowDetached) {
            return null;
        }
        throw new Error('Aborted due to repo ' + process.cwd() + ' not being on a named branch. ' + e.message);
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

exports.retrieveCurrentTagName = function() {
    // This will return the tag name plus commit info it not directly at a tag.
    // That's fine since all users of this function are meant to use the result
    // in an equality check.
    return executil.execHelper(executil.ARGS('git describe --tags HEAD'), true, true);
}

exports.hashForRef = function(ref) {
    return executil.execHelper(executil.ARGS('git rev-parse', ref), true, true);
};

exports.resetFromOrigin = function() {
    return executil.execHelper(executil.ARGS('git reset --hard origin/master'), false, true);
}

exports.gitClean = function() {
    return executil.execHelper(executil.ARGS('git clean -d -f'), false, true);
}
