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

var fs = require('fs');
var optimist = require('optimist');
var apputil = require('./apputil');
var executil = require('./executil');
var flagutil = require('./flagutil');
var print = apputil.print;

module.exports = function*(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    opt = flagutil.registerHelpFlag(opt);
    opt = flagutil.registerDepthFlag(opt);
    var argv = opt
        .usage('Clones git repositories into the current working directory. If the repositories are already cloned, then this is a no-op.\n\n' +
               'Usage: $0 clone --repo=name [--repo=othername]')
        .argv;

    if (argv.h || argv.r == 'auto') {
        optimist.showHelp();
        process.exit(1);
    }

    var depth = argv.depth ? argv.depth : null;

    var repos = flagutil.computeReposFromFlag(argv.r);
    yield cloneRepos(repos, false, depth);
}

function createRepoUrl(repo) {
    return 'https://git-wip-us.apache.org/repos/asf/' + repo.repoName + '.git';
}

function *cloneRepos(repos, quiet, depth) {
    var failures = [];
    var numSkipped = 0;

    var clonePromises = [];
    for (var i = 0; i < repos.length; ++i) {
        var repo = repos[i];
        if (fs.existsSync(repo.repoName)) {
            if(!quiet) print('Repo already cloned: ' + repo.repoName);
            numSkipped +=1 ;
        } else if (repo.svn) {
            clonePromises.push(executil.execHelper(executil.ARGS('svn checkout ' + repo.svn + ' ' + repo.repoName)));
        } else {
            var depthArg = depth == null ? '' : '--depth ' + depth + ' ';
            clonePromises.push(executil.execHelper(executil.ARGS('git clone ' + depthArg + createRepoUrl(repo))));
        }
    }

    if (clonePromises.length > 1) {
        print('Waiting for clones to finish...');
    }
    yield clonePromises;

    var numCloned = repos.length - numSkipped;
    if (numCloned) {
        print('Successfully cloned ' + numCloned + ' repositories.');
    }
}
module.exports.cloneRepos = cloneRepos;

