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

var optimist = require('optimist');
var executil = require('./executil');
var flagutil = require('./flagutil');
var repoutil = require('./repoutil');

module.exports = function * () {
    var opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerHelpFlag(opt);
    opt.usage('A version of `git shortlog -s` aggregated across multiple repos.\n' +
              '\n' +
              'Usage: $0 shortlog [--repo=ios] [--days=7] [--filter=regexp]\n' +
              '    --filter: Sum up all commits that match this pattern\n' +
              '    --days=n: Show commits from the past n days');

    const argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);
    var emailFilter = argv.filter && new RegExp(argv.filter);
    var days = argv.days || 7;
    var resultsByAuthor = {};
    yield repoutil.forEachRepo(repos, function * (repo) {
        var cmd = executil.ARGS('git shortlog -s -e --no-merges ', '--since=' + days + ' days ago');
        var output = yield executil.execHelper(cmd, true);
        if (output) {
            output.split(/\n/).forEach(function (line) {
                var m = /\s*(\d+).*?<(.*?)>/.exec(line);
                var author = m[2];
                var count = +m[1];
                resultsByAuthor[author] = +(resultsByAuthor[author] || 0) + count;
            });
        }
    });

    var total = 0;
    var filterTotal = 0;
    var records = Object.keys(resultsByAuthor).map(function (author) {
        var count = resultsByAuthor[author];
        total += count;
        if (emailFilter && emailFilter.exec(author)) {
            filterTotal += count;
        }
        return { author: author, count: count };
    });
    records.sort(function (a, b) {
        return b.count - a.count;
    });

    records.forEach(function (r) {
        console.log(r.count + '\t' + r.author);
    });
    console.log();
    if (emailFilter) {
        console.log('Total that mathed filter: ' + filterTotal);
    }
    console.log('Total Commits: ' + total);
};
