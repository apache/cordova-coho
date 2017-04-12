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

var apputil = require('./apputil');
var superspawn = require('./superspawn');

var gitCommitCount = 0;

function ARGS (s, var_args) {
    var ret = s.trim().split(/\s+/);
    for (var i = 1; i < arguments.length; ++i) {
        ret.push(arguments[i]);
    }
    return ret;
}
exports.ARGS = ARGS;

exports.verbose = false;

// silent = false ==> print command and output
// silent == true or 1 ==> don't print command, don't print output
// silent == 2 ==> don't print command, print output
// silent == 3 ==> print command, don't print output
// TODO: this function should be consolidated to promises, and shouldnt take win/fail callbacks.
// some async confusion here
function execHelper (cmdAndArgs, silent, allowError, win, fail) {
    // there are times where we want silent but not allowError.
    if (allowError == null) {
        // default to allow failure if being silent.
        allowError = allowError || silent;
    }
    if (/^git commit/.exec(cmdAndArgs.join(' '))) {
        gitCommitCount++;
    }
    cmdAndArgs[0] = cmdAndArgs[0].replace(/^git /, 'git -c color.ui=always ');
    if (!silent || silent === 3 || exports.verbose) {
        apputil.print('Executing:', cmdAndArgs.join(' '));
    }
    var result = superspawn.spawn(cmdAndArgs[0], cmdAndArgs.slice(1), {stdio: (silent && (silent !== 2)) ? 'default' : 'inherit'});
    return result.then(win || null, fail || function (e) {
        if (allowError) {
            throw e;
        } else if (+silent !== 1) {
            apputil.print(e.output);
        }
        process.exit(2);
    });
}
exports.execHelper = execHelper;

function reportGitPushResult (repos, branches) {
    apputil.print('');
    if (gitCommitCount) {
        var flagsStr = repos.map(function (r) { return '-r ' + r.id; }).join(' ') + ' ' + branches.map(function (b) { return '-b ' + b; }).join(' ');
        apputil.print('All work complete. ' + gitCommitCount + ' commits were made locally.');
        apputil.print('To review changes:');
        apputil.print('  ' + process.argv[1] + ' repo-status ' + flagsStr + ' --diff | less');
        apputil.print('To push changes:');
        apputil.print('  ' + process.argv[1] + ' repo-push ' + flagsStr);
        apputil.print('To revert all local commits:');
        apputil.print('  ' + process.argv[1] + ' repo-reset ' + flagsStr);
    } else {
        apputil.print('All work complete. No commits were made.');
    }
}

exports.reportGitPushResult = reportGitPushResult;

function * execOrPretend (cmd, pretend) {
    if (pretend) {
        apputil.print('PRETENDING TO RUN: ' + cmd.join(' '));
    } else {
        return yield execHelper(cmd);
    }
}
exports.execOrPretend = execOrPretend;
