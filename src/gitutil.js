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

var executil = require('./executil');
var gitutil = exports;
var semver = require('semver');

/**
 * Returns the greatest semver-looking tag in the repo. If prefix is specified, only looks at tags that start with
 * 'prefix-' (this allows for multiple modules in the same repo).
 * @param {string} [prefix] - An optional prefix to filter tags.
 * @returns {Array} - the most recent tag as as the 0th index in an array (with the second recent as the next index), or null if no version tags are found.
 * ignores r tags in plugins
 */
exports.findMostRecentTag = function * (prefix) {
    prefix = prefix && prefix + '-';
    var finalBest;
    var lastBest;

    var ret = (yield executil.execHelper(executil.ARGS('git tag --list'), true)).split(/\s+/)
        .reduce(function (curBest, value) {
            var modifiedCurBest, modifiedValue;
            if (prefix) {
                // Ignore values that don't start with prefix, and strip prefix from the value we're going to test
                if (value.indexOf(prefix) !== 0) {
                    modifiedValue = null;
                    modifiedCurBest = null;
                } else {
                    modifiedValue = value.substr(prefix.length);
                    modifiedCurBest = curBest && curBest.substr(prefix.length);
                }
            } else {
                // used to strip out r for plugins, but now leave it in so they fail semver check
                modifiedCurBest = curBest;
                modifiedValue = value;
            }

            if (semver.valid(modifiedValue)) {
                // use finalBest to hold onto reference outside of reduce function
                finalBest = !curBest ? value : semver.gt(modifiedCurBest, modifiedValue) ? finalBest : value;
                if (curBest < finalBest) {
                    lastBest = curBest;
                }
                return !curBest ? value : semver.gt(modifiedCurBest, modifiedValue) ? curBest : value;
            } else if (curBest && semver.valid(modifiedCurBest)) {
                if (curBest < finalBest) {
                    lastBest = curBest;
                }
                return curBest;
            } else if (finalBest) {
                if (curBest < finalBest) {
                    lastBest = curBest;
                }
                return finalBest;
            }
            return null;
        });

    if (ret) {
        if (lastBest) {
            return [ ret, lastBest ];
        } else {
            return [ ret ];
        }
    } else {
        return null;
    }
};

exports.tagExists = function * (tagName) {
    return !!(yield executil.execHelper(executil.ARGS('git tag --list ' + tagName), true));
};

exports.retrieveCurrentBranchName = function * (allowDetached) {
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
};

exports.remoteBranchExists = function * (repo, branch) {
    var branch_token = (repo.remoteName || 'origin') + '/' + branch;
    var stdout = yield executil.execHelper(executil.ARGS('git branch -r --list ' + branch_token), false, false);
    if (stdout.indexOf(branch_token) > -1) {
        return true;
    } else {
        return false;
    }
};

exports.stashAndPop = function * (repo, func) {
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
};

exports.pendingChangesExist = function * () {
    return !!(yield executil.execHelper(executil.ARGS('git status --porcelain'), true));
};

exports.gitCheckout = function * (branchName) {
    var curBranch = yield gitutil.retrieveCurrentBranchName(true);
    if (curBranch !== branchName) {
        // EXTRA WORKAROUND SOLUTION for package.json,
        // as needed for cordova-osx & Windows
        // FUTURE TBD better solution for package.json?
        yield executil.execHelper(executil.ARGS('git checkout -- package.json'));
        return yield executil.execHelper(executil.ARGS('git checkout -q ', branchName));
    }
};

exports.createNewBranch = function * (branchName) {
    return yield executil.execHelper(executil.ARGS('git branch ', branchName));
};

exports.localBranchExists = function * (name) {
    return !!(yield executil.execHelper(executil.ARGS('git branch --list ' + name), true));
};

exports.retrieveCurrentTagName = function () {
    // This will return the tag name plus commit info it not directly at a tag.
    // That's fine since all users of this function are meant to use the result
    // in an equality check.
    return executil.execHelper(executil.ARGS('git describe --tags HEAD'), true, true);
};

exports.hashForRef = function (ref) {
    return executil.execHelper(executil.ARGS('git rev-parse', ref), true, true);
};

exports.resetFromOrigin = function () {
    return executil.execHelper(executil.ARGS('git reset --hard origin/master'), false, true);
};

exports.gitClean = function () {
    return executil.execHelper(executil.ARGS('git clean -d -f'), false, true);
};

exports.summaryOfChanges = function * (base_sha) {
    var cmd = executil.ARGS('git log --topo-order --no-merges');
    cmd.push(['--pretty=format:* %s']);
    cmd.push(base_sha + '..master');
    return yield executil.execHelper(cmd, true, false);
};

exports.commitChanges = function * (commit_msg) {
    return yield executil.execHelper(executil.ARGS('git commit -am', commit_msg));
};

exports.tagRepo = function * (version) {
    return yield executil.execHelper(executil.ARGS('git tag', version));
};

exports.pushToOrigin = function * (ref) {
    return yield executil.execHelper(executil.ARGS('git push origin', ref));
};

exports.diff = function * (first, second) {
    var args = executil.ARGS('git diff', first + '..' + second);
    return yield executil.execHelper(args, true, false);
};

exports.merge = function * (ref, win, fail) {
    return yield executil.execHelper(executil.ARGS('git merge', ref), false, false, win, fail);
};
