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

const fs = require('fs');
const optimist = require('optimist');
const apputil = require('./apputil');
const executil = require('./executil');
const flagutil = require('./flagutil');
const print = apputil.print;

module.exports = function * (_argv) {
    let opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerHelpFlag(opt);
    opt = flagutil.registerDepthFlag(opt);
    const argv = opt
        .usage('Clones git repositories as siblings of cordova-coho (unless --no-chdir or --global is used). If the repositories are already cloned, then this is a no-op.\n\n' +
               'Usage: $0 repo-clone [--depth 1] --repo=name [-r repos]')
        .argv;

    if (argv.h || argv.r === 'auto') {
        optimist.showHelp();
        process.exit(1);
    }

    const depth = argv.depth ? argv.depth : null;

    const repos = flagutil.computeReposFromFlag(argv.r, { includeSvn: true });
    yield cloneRepos(repos, false, depth);
};

function createRepoUrl (repo) {
    return 'https://github.com/apache/' + repo.repoName + '.git';
}

function * cloneRepos (repos, quiet, depth) {
    const failures = []; // eslint-disable-line no-unused-vars
    let numSkipped = 0;

    const clonePromises = [];
    for (let i = 0; i < repos.length; ++i) {
        const repo = repos[i];
        if (fs.existsSync(repo.repoName)) {
            if (!quiet) print('Repo already cloned: ' + repo.repoName);
            numSkipped += 1;
        } else if (repo.svn) {
            clonePromises.push(executil.execHelper(executil.ARGS('svn checkout ' + repo.svn + ' ' + repo.repoName + ' ' + '--trust-server-cert --non-interactive')));
        } else {
            const depthArg = depth == null ? '' : '--depth ' + depth + ' ';
            clonePromises.push(executil.execHelper(executil.ARGS('git clone ' + depthArg + createRepoUrl(repo))));
        }
    }

    if (clonePromises.length > 1) {
        print('Waiting for clones to finish...');
    }
    yield clonePromises;

    const numCloned = repos.length - numSkipped;
    if (numCloned) {
        print('Successfully cloned ' + numCloned + ' repositories.');
    }
}
module.exports.cloneRepos = cloneRepos;
