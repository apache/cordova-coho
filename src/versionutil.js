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
var shelljs = require('shelljs');
var apputil = require('./apputil');
var executil = require('./executil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');

function removeDev(version) {
    var newVersion = version.replace('-dev', '');
    return newVersion;
}
exports.removeDev = removeDev;

//updates platformsConfig.json
//Needs to be passed a object which includes repo.id as key
//and the new version as value
//ex {android:4.0.0}
function *updatePlatformsConfig(newValues) {

    var platformsConfig = path.join(repoutil.getRepoDir('cordova-lib'),
        'src/cordova/platformsConfig.json');
    console.log(platformsConfig);
    var platformsJS = require(platformsConfig);

    var repos = flagutil.computeReposFromFlag('active-platform');

    yield repoutil.forEachRepo(repos, function*(repo) {
        if(repo.id === 'windows') {
            platformsJS[repo.id].version = newValues[repo.id];
            platformsJS['windows8'].version = newValues[repo.id];
        } else if(repo.id === 'blackberry') {
            platformsJS['blackberry10'].version = newValues[repo.id];
        } else {
            platformsJS[repo.id].version = newValues[repo.id];
        }
    });

    fs.writeFileSync(platformsConfig, JSON.stringify(platformsJS, null, 4), 'utf8', function(err) {
        if (err) return console.log (err);
    });
}
exports.updatePlatformsConfig = updatePlatformsConfig;

/**
 * Updates VERSION file, version executable script and package.json using specified
 *   version. Also commits change made to the repo if opposite is not specified.
 *
 * @param {Object}  repo    Repo to update version for
 * @param {String}  version A semver-compatible version to write to repo's files
 * @param {Object}  [opts]  An options object
 * @param {Boolean} [opts.commitChanges=true] Specifies whether to commit changes
 *   to the repo after update is done.
 */
exports.updateRepoVersion = function *updateRepoVersion(repo, version, opts) {
    // Update the VERSION files.
    var versionFilePaths = repo.versionFilePaths || ['VERSION'];
    var isPlatformRepo = !!repoutil.isInRepoGroup(repo, 'platform');
    if (isPlatformRepo && fs.existsSync(versionFilePaths[0])) {
        versionFilePaths.forEach(function(versionFilePath) {
            fs.writeFileSync(versionFilePath, version + '\n');
        });
        shelljs.config.fatal = true;
        if (repo.id == 'android' || repo.id == 'amazon-fireos') {
            shelljs.sed('-i', /CORDOVA_VERSION.*=.*;/, 'CORDOVA_VERSION = "' + version + '";', path.join('framework', 'src', 'org', 'apache', 'cordova', 'CordovaWebView.java'));
            shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'templates', 'cordova', 'version'));
        } else if (repo.id == 'ios' || repo.id == 'osx') {
            shelljs.sed('-i', /VERSION.*=.*/, 'VERSION="' + version + '";', path.join('bin', 'templates', 'scripts', 'cordova', 'version'));
        } else if (repo.id == 'blackberry') {
            shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'templates', 'project','cordova', 'lib', 'version.js'));
        } else if (repo.id == 'firefoxos' || repo.id == 'browser' || repo.id == 'ubuntu') {
            shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'templates', 'project','cordova', 'version'));
        } else if (repo.id == 'windows') {
            if(fs.existsSync(path.join('template', 'cordova', 'version'))) {
                console.log('version exists');
                shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('template', 'cordova', 'version'));
            }
        }
        shelljs.config.fatal = false;
        if (!(yield gitutil.pendingChangesExist())) {
            apputil.print('VERSION file was already up-to-date.');
        }
    } else {
        if (isPlatformRepo) console.warn('No VERSION file exists in repo ' + repo.repoName);
    }

    // Update the package.json VERSION.
    var packageFilePaths = repo.packageFilePaths || ['package.json'];
    if (fs.existsSync(packageFilePaths[0])) {
        fs.readFile(packageFilePaths[0], {encoding: 'utf-8'}, function (err, data) {
            if (err) throw err;
            var packageJSON = JSON.parse(data);
            packageJSON.version = version;
            fs.writeFileSync(packageFilePaths[0], JSON.stringify(packageJSON, null, "    "));
        });
        if (!(yield gitutil.pendingChangesExist())) {
            apputil.print('package.json file was already up-to-date.');
        }
    } else {
        console.warn('No package.json file exists in repo ' + repo.repoName);
    }

    var commitChanges = !!(opts ? opts.commitChanges : true);
    if (commitChanges && (yield gitutil.pendingChangesExist())) {
        yield executil.execHelper(executil.ARGS('git commit -am', 'Set VERSION to ' + version + ' (via coho)'));
    }
}
