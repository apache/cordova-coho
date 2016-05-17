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

module.exports = function*(argv) {
    /** Specifies the default repos to build nightlies for */
    var DEFAULT_NIGHTLY_REPOS = ['cli', 'lib'];

    var opt = flagutil.registerHelpFlag(optimist);
    opt = flagutil.registerRepoFlag(opt);

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
        .default({ r: DEFAULT_NIGHTLY_REPOS})
        .argv;

    if(argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    // Clone and update Repos
    yield prepareRepos(argv.r);

    var reposToBuild = flagutil.computeReposFromFlag(argv.r, { includeModules: true });
    // Get updated nightly versions for all repos
    /** @type {Object} A map of repo.id and a short SHA for every repo to build */
    var VERSIONS = yield retrieveVersions(reposToBuild);

    //update package.json version for cli + lib, update lib reference for cli
    yield repoutil.forEachRepo(reposToBuild, function*(repo) {
        var packageJSONPath = path.join(process.cwd(), 'package.json');
        var packageJSON = require(packageJSONPath);

        // Update package version
        apputil.print('Updating ' + repo.id + ' version to ' + VERSIONS[repo.id]);
        packageJSON.version = VERSIONS[repo.id];

        // If there is a dependencies listed, iterate through and update cordova-* dependencies
        packageJSON.dependencies = mapDependenciesVersions(packageJSON.dependencies, VERSIONS);

        fs.writeFileSync(packageJSONPath, JSON.stringify(packageJSON, null, 4), 'utf8', function(err) {
            if (err) return console.log (err);
        });
    });

    //npm link repos that should be linked
    yield npmlink();

    // npm install cli
    var cli = repoutil.getRepoById('cli');
    yield repoutil.forEachRepo([cli], function*(repo) {
        yield executil.execHelper(executil.ARGS('npm install'), /*silent=*/true, false);
    });

    //run CLI + cordova-lib tests
    yield runTests(reposToBuild, argv.ignoreTestFailures);

    var options = {};
    options.tag = 'nightly';
    options.pretend = argv.pretend;

    //unpublish old nightly
    yield repoutil.forEachRepo(reposToBuild, function*(repo) {
        var packageName = repo.packageName || repo.repoName;
        var oldNightlyVersion = yield executil.execHelper(executil.ARGS('npm view ' + packageName + ' dist-tags.nightly'), /*silent=*/true);

        if (!oldNightlyVersion || oldNightlyVersion === 'undefined') {
            apputil.print(packageName + ' is not yet published under @nightly tag. Skipping unpublish...');
            return;
        }

        apputil.print('Latest ' + packageName + '@nightly version is ' + oldNightlyVersion);

        options.r = [repo.id];
        options.version = oldNightlyVersion;

        yield npmpublish.unpublish(options);
    });

    //publish to npm under nightly tag
    options.r = reposToBuild.map(function (repo) { return repo.id; });
    yield npmpublish.publishTag(options);
};

function* prepareRepos(repoNames) {
    // Clone and update required repos
    apputil.print('Cloning and updating required repositories...');
    var reposToClone = flagutil.computeReposFromFlag(['tools'].concat(repoNames));
    yield repoclone.cloneRepos(reposToClone, /*silent=*/true);
    yield repoupdate.updateRepos(reposToClone, /*silent=*/true);

    // Remove local changes and sync up with remote master
    apputil.print('Resetting repositories to "master" branches...');
    var reposToUpdate = flagutil.computeReposFromFlag(repoNames);
    yield repoutil.forEachRepo(reposToUpdate, function*() {
        yield gitutil.gitClean();
        yield gitutil.resetFromOrigin();
    });
}

/**
 * Updates provided dependencies object with versions, supplied in packageVersions object
 * @param {Object<String, String>} packageDependencies A map of current package's dependencies to versions
 * @param {Object<String, String>} packageVersions Map of package's id's to nightly versions
 * @returns {Object<String, String>} A mapped object
 */
function mapDependenciesVersions(packageDependencies, packageVersions) {
    return Object.keys(packageDependencies)
    .reduce(function (result, dependency) {
        var dep = repoutil.getRepoById(dependency);
        // If this is a cordova-* dependency, and we're going to build nightly for it
        if (dependency.match(/cordova\-.*/) && dep && packageVersions[dep.id]) {
            // Update its version in package's dependencies to nightly version
            apputil.print('Updating ' + dependency + ' dependency version to ' + packageVersions[dep.id]);
            result[dependency] = packageVersions[dep.id];
        }

        return result;
    }, packageDependencies);
}

function *runTests(repos, ignoreTestFailures) {
    yield repoutil.forEachRepo(repos, function *(repo) {
        try {
            yield executil.execHelper(executil.ARGS('npm test'), false, ignoreTestFailures);
        } catch (e) {
            if (!ignoreTestFailures) throw e;
            apputil.print('Skipping failing tests due to "ignore-test-failures flag"');
        }
    });
}

/**
 * Generates suffix for appending to nightly package version
 *   based on current date and SHA string.
 * @param SHA {String} String to use to generate nightly version
 * @returns {String} A newly generated nightly suffix
 */
function getNightlySuffix (SHA) {
    var currentDate = new Date();
    var nightlySuffix = '-nightly.' + currentDate.getFullYear() + '.' +
        (currentDate.getMonth() + 1) + '.' + currentDate.getDate() +
        '+' + SHA;

    return nightlySuffix;
}

/**
 * Generates map of repo.id -> nightly version based on current
 *   date and SHA of current revision of repository
 * @param {Object[]} repos An array of cordova repos
 * @returns {Object} Mapped object
 */
function* retrieveVersions(repos) {
    var SHAJSON = yield retrieveSha(repos);

    return Object.keys(SHAJSON).reduce(function (result, repoId) {
        var repoPath = repoutil.getRepoDir(repoutil.getRepoById(repoId));
        var oldVersion = require(path.join(repoPath, 'package.json')).version;
        result[repoId] = versionutil.removeDev(oldVersion) + getNightlySuffix(SHAJSON[repoId]);
        return result;
    }, {});
}
