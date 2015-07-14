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
var apputil = require('./apputil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');
var print = apputil.print;
var chalk = require('chalk');
var Q = require('q');
var readline = require('readline');

function readInput() {
    var ret = Q.defer();

    var rl = readline.createInterface({
        input: process.stdin
    });

    var data = '';
    rl.on('line', function (line) {
        if (line) {
            data += line + '\n';
        } else {
            rl.close();
        }
    });
    rl.on('close', function () {
        ret.resolve(data);
    });

    return ret.promise;
}

exports.createCommand = function*(argv) {
    var opt = flagutil.registerHelpFlag(optimist);
    var argv = opt
        .usage('Makes sure the given hashs match the tags.\n' +
               'Paste the output of the `print-tags` into this command to verify.\n' +
               'e.g.:     cordova-plugin-camera: 0.3.0 (4fa934e06f)\n' +
               '\n' +
               'Usage: $0 verify-tags\n<paste>\nctrl-D')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    if (process.stdin.isTTY) {
        console.log('Paste in print-tags output then hit Enter');
    }

    var input = yield readInput();
    var pattern = /\s*(cordova-.+?):\s*(.*?)\s+\((.*?)\)/g;
    var m;
    var results = [];
    while (m = pattern.exec(input)) {
        results.push({repoId: m[1], tagName: m[2], hash: m[3]});
    }
    if (results.length === 0) {
        apputil.fatal('Error processing input.');
    }
    var hadErrors = false;
    for (var i = 0, entry; entry = results[i]; ++i) {
        yield repoutil.forEachRepo([repoutil.getRepoById(entry.repoId)], function*(repo) {
            var foundHash = yield gitutil.hashForRef(entry.tagName);
            if (!foundHash) {
                // Plugins have a prefixed 'r'
                foundHash = yield gitutil.hashForRef('r' + entry.tagName);
            }
            if (!foundHash) {
                console.log(entry.repoId + ': ' + chalk.red('Tag not found') + ' (' + chalk.yellow(entry.tagName) + ')');
                hadErrors = true;
            } else if (foundHash.slice(0, entry.hash.length) !== entry.hash) {
                console.log(entry.repoId + ': ' + chalk.red('Hashes don\'t match!'));
            } else {
                console.log(entry.repoId + ': ' + chalk.green('Tag hash verified.'));
            }
        });
    }
    if (hadErrors) {
        console.log('Some tags didn\'t exist. Try updating your repositories and trying again.');
    }
}

