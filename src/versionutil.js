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

const fs = require('node:fs');
const path = require('node:path');
const { globSync } = require('glob');
const plist = require('plist');
const shelljs = require('shelljs');
const xml2js = require('xml2js');
const apputil = require('./apputil');
const flagutil = require('./flagutil');
const gitutil = require('./gitutil');
const repoutil = require('./repoutil');

function * getRepoVersion (repo) {
    let version;
    yield repoutil.forEachRepo([repo], function * () {
        const platformPackage = path.join(process.cwd(), 'package.json');
        const platformPackageJson = require(platformPackage);
        version = platformPackageJson.version;
    });
    return version;
}

exports.getRepoVersion = getRepoVersion;

function removeDev (version) {
    const newVersion = version.replace('-dev', '');
    return newVersion;
}
exports.removeDev = removeDev;

// updates platformsConfig.json
// Needs to be passed a object which includes repo.id as key
// and the new version as value
// ex {android:4.0.0}
function updatePlatformsConfig (newValues) {
    const platformsConfig = path.join(repoutil.getRepoDir(repoutil.getRepoById('lib')),
        'src/platforms/platformsConfig.json');
    const platformsJS = require(platformsConfig);

    flagutil.computeReposFromFlag('active-platform')
        .forEach(function (repo) {
            if (newValues[repo.id]) {
                platformsJS[repo.id].version = newValues[repo.id];
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
 * Updates package.json and plugin.xml and other version-containing files using
 * specified version. Also commits change made to the repo if opposite is not
 * specified.
 *
 * @param {Object}  repo    Repo to update version for
 * @param {String}  version A semver-compatible version to write to repo's files
 * @param {Object}  [opts]  An options object
 * @param {Boolean} [opts.commitChanges=true] Specifies whether to commit changes
 *   to the repo after update is done.
 */
exports.updateRepoVersion = function * updateRepoVersion (repo, version, opts) {
    // TODO: why do we read files asynchronously in this function, but write
    // and check for existence synchronously?
    const isPlatformRepo = !!repoutil.isInRepoGroup(repo, 'platform');

    // Update the VERSION files.
    // As of 2024-10-27 only cordova-browser has a VERSION file and relies on this
    const versionFilePaths = repo.versionFilePaths || ['VERSION'];
    if (isPlatformRepo && fs.existsSync(versionFilePaths[0])) {
        versionFilePaths.forEach(function (versionFilePath) {
            fs.writeFileSync(versionFilePath, version + '\n');
        });

        shelljs.config.fatal = true;

        // Old version location which still exists for some platforms that have not been updated.
        globSync('{bin/,}template{s,}/{scripts/,}cordova/version').forEach(f => {
            shelljs.sed('-i', /\bVERSION\s*=.+?;/, `VERSION = '${version}';`, f);
        });

        /**
         * Version information has be temporary migrating to Api.js...
         * This is because the `cordova/version` shebang line fails to be rewired in node 12.x.
         * Eventually, the version information should come from package.json
         */
        globSync('{bin/,}template{s,}/{scripts/,}cordova/Api.js').forEach(f => {
            shelljs.sed('-i', /const VERSION\s=\s'.*';/, `const VERSION = '${version}';`, f);
        });

        shelljs.config.fatal = false;

        if (!(yield gitutil.pendingChangesExist())) {
            apputil.print('VERSION file was already up-to-date.');
        }
    }

    if (isPlatformRepo) {
        if (repo.id === 'android') {
            shelljs.sed('-i', /CORDOVA_VERSION.*=.*;/, 'CORDOVA_VERSION = "' + version + '";', path.join('framework', 'src', 'org', 'apache', 'cordova', 'CordovaWebView.java'));
        }

        const plistFile = path.join('CordovaLib', 'Info.plist');
        if (repo.id === 'ios' && fs.existsSync(plistFile)) {
            const infoPlist = plist.parse(fs.readFileSync(plistFile, 'utf8'));

            infoPlist.CFBundleShortVersionString = version;

            /* eslint-disable no-tabs */
            // Write out the plist file with the same formatting as Xcode does
            let info_contents = plist.build(infoPlist, { indent: '\t', offset: -1 });
            /* eslint-enable no-tabs */

            info_contents = info_contents.replace(/<string>[\s\r\n]*<\/string>/g, '<string></string>');
            fs.writeFileSync(plistFile, info_contents, 'utf-8');
        }
    }

    // Update the package.json VERSION.
    const packageFilePaths = repo.packageFilePaths || ['package.json'];
    if (fs.existsSync(packageFilePaths[0])) {
        const data = fs.readFileSync(packageFilePaths[0], { encoding: 'utf-8' });
        const packageJSON = JSON.parse(data);
        packageJSON.version = version;
        // use 2 spaces indent similar to npm
        fs.writeFileSync(packageFilePaths[0], JSON.stringify(packageJSON, null, 2) + '\n');
        if (!(yield gitutil.pendingChangesExist())) {
            apputil.print('package.json file was already up-to-date.');
        }
    } else {
        console.warn('No package.json file exists in repo ' + repo.repoName);
    }

    // Update the plugin.xml(s)
    const isPluginRepo = !!repoutil.isInRepoGroup(repo, 'plugins');
    if (isPluginRepo) {
        const xmlFilePaths = repo.xmlFilePaths || ['plugin.xml', 'tests/plugin.xml'];
        xmlFilePaths.forEach(function (xmlFile) {
            if (fs.existsSync(xmlFile)) {
                const data = fs.readFileSync(xmlFile, { encoding: 'utf-8' });
                xml2js.parseString(data, { async: false }, function (err, xml) {
                    if (err) throw err;
                    const prev_version = xml.plugin.$.version;
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

    const commitChanges = !!(opts ? opts.commitChanges : true);
    if (commitChanges && (yield gitutil.pendingChangesExist())) {
        yield gitutil.commitChanges('Set VERSION to ' + version + ' (via coho)');
    }
};
