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
var executil = require('./executil');
var optimist = require('optimist');
var flagutil = require('./flagutil');
var repoutil = require('./repoutil');
var repoupdate = require('./repo-update');
var retrieveSha = require('./retrieve-sha');
var npmpublish = require('./npm-publish');
var versionutil = require('./versionutil');
var gitutil = require('./gitutil');
var fs = require('fs');
var path = require('path');
var npmlink = require('./npm-link');
var repoclone = require('./repo-clone');

function pad(number) {
    if (number < 10) {
        return '0' + number;
    }
    return number;
}

module.exports = function*(argv) {
    var repos = flagutil.computeReposFromFlag('tools');
    var cli = repoutil.getRepoById('cli');
    var cordovaLib = repoutil.getRepoById('lib');
    var opt = flagutil.registerHelpFlag(optimist);

    argv = opt
        .usage('Publish CLI & LIB to NPM under nightly tag. \n' +
               'Cordova platform add uses latest commits to the platforms. \n' +
               'Usage: $0 nightly'
        )
        .options('pretend', {
            desc: 'Don\'t actually publish to npm, just print what would be run.',
            type:'boolean'
        })
        .options('ignore-test-failures', {
            desc: 'Run the tests for cli and lib but don\'t fail the build if the tests are failing',
            type:'boolean',
            alias : 'ignoreTestFailures'
        })
        .argv;

    if(argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    // Clone and update Repos
    yield repoclone.cloneRepos(repos, /*silent=*/true);
    yield repoupdate.updateRepos(repos);

    //remove local changes and sync up with remote master
    yield repoutil.forEachRepo(repos, function*() {
        yield gitutil.gitClean();
        yield gitutil.resetFromOrigin();
    });

    // Get SHAS from repos
    var SHAJSON = yield retrieveSha(repos);

    var currentDate = new Date();
    var nightlyVersion = '-nightly.' + currentDate.getFullYear() + '.' +
                        pad(currentDate.getMonth() + 1) + '.' + pad(currentDate.getDate());
    var cordovaLibVersion;
    //update package.json version for cli + lib, update lib reference for cli
    yield repoutil.forEachRepo([cordovaLib, cli], function*(repo) {
        var dir = process.cwd();
        var packageJSON = require(dir+'/package.json');
        packageJSON.version = versionutil.removeDev(packageJSON.version) + nightlyVersion +
            '+' + SHAJSON[repo.id];

        if(repo.id === 'lib'){
            cordovaLibVersion = packageJSON.version;
        } else {
            packageJSON.dependencies['cordova-lib'] = cordovaLibVersion;
        }

        fs.writeFileSync(dir+'/package.json', JSON.stringify(packageJSON, null, 4), 'utf8', function(err) {
            if (err) return console.log (err);
        });
    });

    //npm link repos that should be linked
    yield npmlink();

    // npm install cli
    yield repoutil.forEachRepo([cli], function*(repo) {
        yield executil.execHelper(executil.ARGS('npm install'), /*silent=*/true, false);
    });

    //run CLI + cordova-lib tests
    yield runTests(cli, cordovaLib, argv.ignoreTestFailures);

    var options = {};
    options.tag = 'nightly';
    options.pretend = argv.pretend;

    //unpublish old nightly
    yield repoutil.forEachRepo([cordovaLib, cli], function*(repo) {
        var repoName = repo.id === 'cli' ? 'cordova' : repo.repoName;
        var oldNightlyVersion = yield executil.execHelper(executil.ARGS('npm view ' + repoName + ' dist-tags.nightly'));
        apputil.print('Latest ' + repoName + '@nightly version is ' + oldNightlyVersion);

        options.r = [repo.id];
        options.version = oldNightlyVersion;

        yield npmpublish.unpublish(options);
    });

    options.r = ['lib', 'cli'];
    //publish to npm under nightly tag
    yield npmpublish.publishTag(options);
}

function *runTests(cli, lib, ignoreTestFailures) {
    yield repoutil.forEachRepo([cli, lib], function *(repo) {
        try {
            yield executil.execHelper(executil.ARGS('npm test'), false, ignoreTestFailures);
        } catch (e) {
            if (!ignoreTestFailures) throw e;
            apputil.print('Skipping failing tests due to "ignore-test-failures flag"');
        }
    });
}
