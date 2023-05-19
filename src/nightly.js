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

const apputil = require('./apputil');
const optimist = require('optimist');
const flagutil = require('./flagutil');
const repoutil = require('./repoutil');
const repoupdate = require('./repo-update');
const retrieveSha = require('./retrieve-sha');
const npmpublish = require('./npm-publish');
const versionutil = require('./versionutil');
const gitutil = require('./gitutil');
const fs = require('fs');
const path = require('path');
const repoclone = require('./repo-clone');

module.exports = function * (argv) {
    /** Specifies the default repos to build nightlies for */
    const DEFAULT_NIGHTLY_REPOS = ['cli', 'lib', 'fetch', 'common', 'create', 'coho'];

    let opt = flagutil.registerHelpFlag(optimist);
    opt = flagutil.registerRepoFlag(opt);

    argv = opt
        .usage('Publish CLI & LIB to NPM under nightly tag. \n' +
               'Cordova platform add uses latest commits to the platforms. \n' +
               'Usage: $0 nightly'
        )
        .options('pretend', {
            desc: 'Don\'t actually publish to npm, just print what would be run.',
            type: 'boolean'
        })
        .default({ r: DEFAULT_NIGHTLY_REPOS })
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    // Clone and update Repos
    yield prepareRepos(argv.r);

    const reposToBuild = flagutil.computeReposFromFlag(argv.r, { includeModules: true });
    // Get updated nightly versions for all repos
    /** @type {Object} A map of repo.id and a short SHA for every repo to build */
    const VERSIONS = yield retrieveVersions(reposToBuild);

    // Update version in package.json and other respective files for every repo
    // and update dependencies to use nightly versions of packages to be released
    yield repoutil.forEachRepo(reposToBuild, function * (repo) {
        apputil.print('Updating ' + repo.id + ' version to ' + VERSIONS[repo.id]);
        yield versionutil.updateRepoVersion(repo, VERSIONS[repo.id], { commitChanges: false });
        updateRepoDependencies(repo, VERSIONS);
    });

    // Pin nightly versions of platforms
    if (reposToBuild.some(function (repo) { return repo.id === 'lib'; })) {
        apputil.print('Updating platforms pinned versions...');
        versionutil.updatePlatformsConfig(VERSIONS);
    }

    const options = {};
    options.tag = 'nightly';
    options.pretend = argv.pretend;
    options.r = reposToBuild.map(function (repo) { return repo.id; });

    // publish to npm under nightly tag
    yield npmpublish.publishTag(options);
};

function * prepareRepos (repoNames) {
    // Clone and update required repos
    apputil.print('Cloning and updating required repositories...');
    const reposToClone = flagutil.computeReposFromFlag(['tools'].concat(repoNames));
    yield repoclone.cloneRepos(reposToClone, /* silent= */true);
    yield repoupdate.updateRepos(reposToClone, /* silent= */true);

    // Remove local changes and sync up with remote master
    apputil.print('Resetting repositories to "master" branches...');
    const reposToUpdate = flagutil.computeReposFromFlag(repoNames);
    yield repoutil.forEachRepo(reposToUpdate, function * () {
        yield gitutil.gitClean();
        yield gitutil.resetFromOrigin();
    });
}

/**
 * Updates current repo dependencies with versions, supplied in dependencies object
 * @param {Object} repo Current repo which dependencies need to be updated
 * @param {Object<String, String>} dependencies Map of package's id's and nightly versions
 */
function updateRepoDependencies (repo, dependencies) {
    const packageJSONPath = path.join(process.cwd(), 'package.json');
    const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath));

    // Let's iterate through repos we're going to release
    // eslint-disable-next-line array-callback-return
    Object.keys(dependencies).map(function (dependencyId) {
        const repo = repoutil.getRepoById(dependencyId);
        const packageId = repo.packageName || repo.repoName;

        if (packageJSON.dependencies[packageId]) {
            // If current repo has dependency that points to one of packages, we're going
            // to release, update that dependency's version to nightly
            apputil.print('Updating ' + packageId + ' dependency version to ' + dependencies[dependencyId]);
            packageJSON.dependencies[packageId] = dependencies[dependencyId];
        }
    });

    fs.writeFileSync(packageJSONPath, JSON.stringify(packageJSON, null, 2) + '\n', 'utf8');
}

/**
 * Generates suffix for appending to nightly package version
 *   based on current date and SHA string.
 * @param SHA {String} String to use to generate nightly version
 * @returns {String} A newly generated nightly suffix
 */
function getNightlySuffix (SHA) {
    const currentDate = new Date();
    // converts "2023-05-09T18:20:32.730Z" to "20230509182032730"
    const dateTime = currentDate.toISOString().replace(/[T|Z\-:.]/g, '');
    // @see https://semver.org/#spec-item-10
    // Example: -nightly+20230509182032730.sha.8d2286c9
    return `-nightly.${dateTime}.sha.${SHA}`;
}

/**
 * Generates map of repo.id -> nightly version based on current
 *   date and SHA of current revision of repository
 * @param {Object[]} repos An array of cordova repos
 * @returns {Object} Mapped object
 */
function * retrieveVersions (repos) {
    const SHAJSON = yield retrieveSha(repos);

    return Object.keys(SHAJSON).reduce(function (result, repoId) {
        const repoPath = repoutil.getRepoDir(repoutil.getRepoById(repoId));
        const oldVersion = require(path.join(repoPath, 'package.json')).version;
        result[repoId] = versionutil.removeDev(oldVersion) + getNightlySuffix(SHAJSON[repoId]);
        return result;
    }, {});
}
