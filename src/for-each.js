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

const optimist = require('optimist');
const executil = require('./executil');
const flagutil = require('./flagutil');
const repoutil = require('./repoutil');

module.exports = function * () {
    let opt = flagutil.registerRepoFlag(optimist);
    let cmd;
    opt = flagutil.registerHelpFlag(opt);
    const argv = opt
        .usage('Performs the supplied shell command in each repo directory.\n' +
               'Use "$r" as pseudo variable for repo name.\n' +
               '\n' +
               'Usage: $0 for-each [-r reponame] "shell command"')
        .argv;

    if (argv.h || argv._.length <= 1) {
        optimist.showHelp();
        process.exit(1);
    }
    const repos = flagutil.computeReposFromFlag(argv.r);
    if (process.platform === 'win32') {
        cmd = ['cmd', '/s', '/c', argv._[1]];
    } else {
        cmd = [process.env.SHELL || 'sh', '-c', argv._[1]];
    }

    yield repoutil.forEachRepo(repos, function * (repo) {
        const replacedCmd = [];
        for (let i = 0; i < cmd.length; i++) {
            replacedCmd[i] = cmd[i].replace(/\$r/g, repo.repoName);
        }
        yield executil.execHelper(replacedCmd, false, true);
    });
};
