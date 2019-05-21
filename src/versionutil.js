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
var xml2js = require('xml2js');
var apputil = require('./apputil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');

function * getRepoVersion (repo) {
    var version;
    yield repoutil.forEachRepo([repo], function * () {
        var platformPackage = path.join(process.cwd(), 'package.json');
        var platformPackageJson = require(platformPackage);
        version = platformPackageJson.version;
    });
    return version;
}

exports.getRepoVersion = getRepoVersion;

function removeDev (version) {
    var newVersion = version.replace('-dev', '');
    return newVersion;
}
exports.removeDev = removeDev;

// updates platformsConfig.json
// Needs to be passed a object which includes repo.id as key
// and the new version as value
// ex {android:4.0.0}
function updatePlatformsConfig (newValues) {

    var platformsConfig = path.join(repoutil.getRepoDir(repoutil.getRepoById('lib')),
        'src/platforms/platformsConfig.json');
    var platformsJS = require(platformsConfig);

    flagutil.computeReposFromFlag('active-platform')
        .forEach(function (repo) {
            if (newValues[repo.id]) {
            // For blackberry platformsConfig.json uses 'blackberry10' key
                var correctRepoId = (repo.id === 'blackberry') ? 'blackberry10' : repo.id;
                platformsJS[correctRepoId].version = newValues[repo.id];
            }
        });

    fs.writeFileSync(platformsConfig, JSON.stringify(platformsJS, null, 4) + '\n', 'utf8', function (err) {
        if (err) return console.log(err);
    });
}
exports.updatePlatformsConfig = updatePlatformsConfig;

exports.getReleaseBranchNameFromVersion = function (version) {
    if (/-dev$/.test(version)) {
        return 'master';
    }
    return version.replace(/\d+(-?rc\d)?$/, 'x');
};

/**
 * Updates VERSION file, version executable script, package.json and
 * plugin.xml(s) using specified version. Also commits change made to the repo
 * if opposite is not specified.
 *
 * @param {Object}  repo    Repo to update version for
 * @param {String}  version A semver-compatible version to write to repo's files
 * @param {Object}  [opts]  An options object
 * @param {Boolean} [opts.commitChanges=true] Specifies whether to commit changes
 *   to the repo after update is done.
 * @param {String}  [opts.pre=''] Optional commit prefix
 */
exports.updateRepoVersion = function * updateRepoVersion (repo, version, opts) {
    // Update the VERSION files.
    // TODO: why do we read files asynchronously in this function, but write
    // and check for existence synchronously?
    var versionFilePaths = repo.versionFilePaths || ['VERSION'];
    var isPlatformRepo = !!repoutil.isInRepoGroup(repo, 'platform');
    if (isPlatformRepo && fs.existsSync(versionFilePaths[0])) {
        versionFilePaths.forEach(function (versionFilePath) {
            fs.writeFileSync(versionFilePath, version + '\n');
        });
        shelljs.config.fatal = true;
        if (repo.id === 'android' || repo.id === 'amazon-fireos') {
            shelljs.sed('-i', /CORDOVA_VERSION.*=.*;/, 'CORDOVA_VERSION = "' + version + '";', path.join('framework', 'src', 'org', 'apache', 'cordova', 'CordovaWebView.java'));
            shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'templates', 'cordova', 'version'));
            // Set build.gradle version, vcsTag, and name
            shelljs.sed('-i', /version.*=.*/, "version = '" + version + "'", path.join('framework', 'build.gradle'));
            shelljs.sed('-i', /vcsTag.*=.*/, "vcsTag = '" + version + "'", path.join('framework', 'build.gradle'));
            shelljs.sed('-i', /version.{\n.*(name.*=.*)/, "version {\n            name = '" + version + "'", path.join('framework', 'build.gradle'));
        } else if (repo.id === 'ios' || repo.id === 'osx') {
            shelljs.sed('-i', /VERSION.*=.*/, 'VERSION="' + version + '";', path.join('bin', 'templates', 'scripts', 'cordova', 'version'));
        } else if (repo.id === 'blackberry') {
            shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'templates', 'project', 'cordova', 'lib', 'version.js'));
        } else if (repo.id === 'firefoxos' || repo.id === 'ubuntu') {
            shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'templates', 'project', 'cordova', 'version'));
        } else if (repo.id === 'windows') {
            if (fs.existsSync(path.join('template', 'cordova', 'version'))) {
                shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('template', 'cordova', 'version'));
            }
        } else if (repo.id === 'browser' || repo.id === 'electron') {
            if (fs.existsSync(path.join('bin', 'template', 'cordova', 'version'))) {
                shelljs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'template', 'cordova', 'version'));
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
    var pendingChangesExistInJSON = false;
    if (fs.existsSync(packageFilePaths[0])) {
        var data = fs.readFileSync(packageFilePaths[0], { encoding: 'utf-8' });
        var packageJSON = JSON.parse(data);
        packageJSON.version = version;
        // use 2 spaces indent similar to npm
        fs.writeFileSync(packageFilePaths[0], JSON.stringify(packageJSON, null, 2) + '\n');
        pendingChangesExistInJSON = yield gitutil.pendingChangesExist();
        if (!pendingChangesExistInJSON) {
            apputil.print('package.json file was already up-to-date.');
        }
    } else {
        console.warn('No package.json file exists in repo ' + repo.repoName);
    }

    // Update the plugin.xml(s)
    var isPluginRepo = !!repoutil.isInRepoGroup(repo, 'plugins');
    if (isPluginRepo) {
        var xmlFilePaths = repo.xmlFilePaths || ['plugin.xml', 'tests/plugin.xml'];
        xmlFilePaths.forEach(function (xmlFile) {
            if (fs.existsSync(xmlFile)) {
                var data = fs.readFileSync(xmlFile, { encoding: 'utf-8' });
                xml2js.parseString(data, { async: false }, function (err, xml) {
                    if (err) throw err;
                    var prev_version = xml.plugin['$'].version;
                    shelljs.sed('-i', new RegExp('version="' + prev_version + '"', 'i'), 'version="' + version + '"', xmlFile);
                });
            } else {
                console.warn('No ' + xmlFile + ' file exists in repo ' + repo.repoName);
            }
        });
        if (!(yield gitutil.pendingChangesExist())) {
            apputil.print(xmlFilePaths + ' were already up-to-date.');
        }
    }

    var commitChanges = !!(opts ? opts.commitChanges : true);
    if (commitChanges && (yield gitutil.pendingChangesExist())) {
        var versionDescription = pendingChangesExistInJSON ?
            'version & VERSION' : 'VERSION';
        var pre = opts.pre || '';
        yield gitutil.commitChanges(pre + 'Set ' + versionDescription + ' to ' + version + ' (coho)');
    }
};
