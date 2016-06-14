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
var path = require('path');
var optimist = require('optimist');
var executil = require('./executil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');
var linkify = require('jira-linkify');

module.exports = function*() {
    var meEmail = yield executil.execHelper(executil.ARGS('git config user.email'), true);
    var opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerHelpFlag(opt)
        .usage('Updates release notes with commits since the most recent tag.\n' +
        '\n' +
        'Usage: $0 update-release-notes [--repo=ios]');
    argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    var repos = flagutil.computeReposFromFlag(argv.r, {includeModules: true});

    var cmd = executil.ARGS('git log --topo-order --no-merges');
    cmd.push(['--pretty=format:* %s']);
    yield repoutil.forEachRepo(repos, function*(repo) {
        var tag = yield gitutil.findMostRecentTag(repo.versionPrefix);
        cmd.push(tag + '..master');
        var repoDesc = repo.repoName;
        if (repo.path) {
            repoDesc += '/' + repo.path;
        }
        console.log('Finding commits in ' + repoDesc + ' since tag ' + tag);
        var output = yield executil.execHelper(cmd.concat(repoutil.getRepoIncludePath(repo)), true);
        if (output) {
            var newVersion = require(path.join(process.cwd(), 'package.json')).version;
            var relNotesFile = 'RELEASENOTES.md';
            var data = fs.readFileSync(relNotesFile, {encoding: 'utf8'});
            var pos = data.indexOf('### ');
            var date = new Date().toDateString().split(' ');
            data = data.substr(0, pos) + "### " + newVersion + ' (' + date[1] + ' ' + date[2] + ', ' + date[3] + ')\n' + output + '\n\n' + data.substr(pos);
            fs.writeFileSync(relNotesFile, data, {encoding: 'utf8'});
            linkify.file(relNotesFile);
        }
    });
};
