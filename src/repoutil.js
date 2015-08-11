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

var platformRepos = [
    {
        title: 'Android',
        id: 'android',
        repoName: 'cordova-android',
        jiraComponentName: 'Android',
        cordovaJsPaths: ['bin/templates/project/assets/www/cordova.js']
    }, {
        title: 'iOS',
        id: 'ios',
        repoName: 'cordova-ios',
        jiraComponentName: 'iOS',
        cordovaJsPaths: ['CordovaLib/cordova.js'],
        versionFilePaths: [path.join('CordovaLib', 'VERSION')]
    }, {
        title: 'BlackBerry',
        id: 'blackberry',
        repoName: 'cordova-blackberry',
        jiraComponentName: 'BlackBerry',
        cordovaJsSrcName: 'cordova.blackberry10.js',
        cordovaJsPaths: [path.join('javascript', 'cordova.blackberry10.js')],
        versionFilePaths: [path.join('VERSION')],
        packageFilePaths: [path.join('package.json')]
    }, {
        title: 'Windows',
        id: 'windows',
        repoName: 'cordova-windows',
        jiraComponentName: 'Windows 8',
        cordovaJsSrcName: 'cordova.windows.js',
        cordovaJsPaths: ['template/www/cordova.js'],
        versionFilePaths: ['VERSION'],
        packageFilePaths: ['package.json']
    }, {
        title: 'Windows Phone 8.0',
        id: 'wp8',
        repoName: 'cordova-wp8',
        jiraComponentName: 'WP8',
        cordovaJsSrcName: 'cordova.wp8.js',
        cordovaJsPaths: ['template/www/cordova.js'],
        packageFilePaths: ['package.json']
    }, {
        title: 'Firefox OS',
        id: 'firefoxos',
        repoName: 'cordova-firefoxos',
        jiraComponentName: 'FirefoxOS',
        cordovaJsSrcName: 'cordova.firefoxos.js',
        cordovaJsPaths: ['cordova-lib/cordova.js']
    }, {
        title: 'Mac OSX',
        id: 'osx',
        repoName: 'cordova-osx',
        jiraComponentName: 'OSX',
        cordovaJsPaths: ['CordovaFramework/cordova.js'],
        inactive: true
    }, {
        title: 'Ubuntu',
        id: 'ubuntu',
        repoName: 'cordova-ubuntu',
        jiraComponentName: 'Ubuntu',
        cordovaJsPaths: ['www/cordova.js']
    }, {
        title: 'Amazon Fire OS',
        id: 'amazon-fireos',
        repoName: 'cordova-amazon-fireos',
        jiraComponentName: 'Amazon FireOS',
        cordovaJsPaths: ['framework/assets/www/cordova.js']
    }, {
        title: 'Browser',
        id: 'browser',
        repoName: 'cordova-browser',
        jiraComponentName: 'Browser',
        cordovaJsSrcName: 'cordova.browser.js',
        cordovaJsPaths: ['cordova-lib/cordova.js']
    }, {
        title: 'Bada',
        id: 'bada',
        repoName: 'cordova-bada',
        jiraComponentName: 'Bada',
        inactive: true
    }, {
        title: 'Bada WAC',
        id: 'bada-wac',
        repoName: 'cordova-bada-wac',
        jiraComponentName: 'Bada',
        inactive: true
    }, {
        title: 'WebOS',
        id: 'webos',
        repoName: 'cordova-webos',
        jiraComponentName: 'webOS',
        cordovaJsSrcName: 'cordova.webos.js',
        cordovaJsPaths: ['cordova-lib/cordova.js']
    }, {
        title: 'QT',
        id: 'qt',
        repoName: 'cordova-qt',
        jiraComponentName: 'Qt',
        inactive: true
    }, {
        title: 'Tizen',
        id: 'tizen',
        repoName: 'cordova-tizen',
        jiraComponentName: 'Tizen',
        inactive: true
    }
];

var nonPlatformRepos = [
    {
        title: 'Docs',
        id: 'docs',
        repoName: 'cordova-docs',
        jiraComponentName: 'Docs'
    }, {
        title: 'MobileSpec',
        id: 'mobile-spec',
        repoName: 'cordova-mobile-spec',
        jiraComponentName: 'mobile-spec'
    }, {
        title: 'Hello World App',
        id: 'app-hello-world',
        repoName: 'cordova-app-hello-world',
        jiraComponentName: 'App Hello World'
    }
];

var pluginRepos = [
    {
        title: 'Plugin - Battery Status',
        id: 'plugin-battery-status',
        repoName: 'cordova-plugin-battery-status',
        jiraComponentName: 'Plugin Battery Status',
        inactive: true
    }, {
        title: 'Plugin - Camera',
        id: 'plugin-camera',
        repoName: 'cordova-plugin-camera',
        jiraComponentName: 'Plugin Camera',
        inactive: true
    }, {
        title: 'Plugin - Console',
        id: 'plugin-console',
        repoName: 'cordova-plugin-console',
        jiraComponentName: 'Plugin Console',
        inactive: true
    }, {
        title: 'Plugin - Contacts',
        id: 'plugin-contacts',
        repoName: 'cordova-plugin-contacts',
        jiraComponentName: 'Plugin Contacts',
        inactive: true
    }, {
        title: 'Plugin - Device Motion',
        id: 'plugin-device-motion',
        repoName: 'cordova-plugin-device-motion',
        jiraComponentName: 'Plugin Device Motion',
        inactive: true
    }, {
        title: 'Plugin - Device Orientation',
        id: 'plugin-device-orientation',
        repoName: 'cordova-plugin-device-orientation',
        jiraComponentName: 'Plugin Device Orientation',
        inactive: true
    }, {
        title: 'Plugin - Device',
        id: 'plugin-device',
        repoName: 'cordova-plugin-device',
        jiraComponentName: 'Plugin Device',
        inactive: true
    }, {
        title: 'Plugin - Dialogs',
        id: 'plugin-dialogs',
        repoName: 'cordova-plugin-dialogs',
        jiraComponentName: 'Plugin Dialogs',
        inactive: true
    }, {
        title: 'Plugin - File Transfer',
        id: 'plugin-file-transfer',
        repoName: 'cordova-plugin-file-transfer',
        jiraComponentName: 'Plugin File Transfer',
        inactive: true
    }, {
        title: 'Plugin - File',
        id: 'plugin-file',
        repoName: 'cordova-plugin-file',
        jiraComponentName: 'Plugin File',
        inactive: true
    }, {
        title: 'Plugin - Geolocation',
        id: 'plugin-geolocation',
        repoName: 'cordova-plugin-geolocation',
        jiraComponentName: 'Plugin Geolocation',
        inactive: true
    }, {
        title: 'Plugin - Globalization',
        id: 'plugin-globalization',
        repoName: 'cordova-plugin-globalization',
        jiraComponentName: 'Plugin Globalization',
        inactive: true
    }, {
        title: 'Plugin - InAppBrowser',
        id: 'plugin-inappbrowser',
        repoName: 'cordova-plugin-inappbrowser',
        jiraComponentName: 'Plugin InAppBrowser',
        inactive: true
    }, {
        title: 'Plugin - Media',
        id: 'plugin-media',
        repoName: 'cordova-plugin-media',
        jiraComponentName: 'Plugin Media',
        inactive: true
    }, {
        title: 'Plugin - Media Capture',
        id: 'plugin-media-capture',
        repoName: 'cordova-plugin-media-capture',
        jiraComponentName: 'Plugin Media Capture',
        inactive: true
    }, {
        title: 'Plugin - Network Information',
        id: 'plugin-network-information',
        repoName: 'cordova-plugin-network-information',
        jiraComponentName: 'Plugin Network Information',
        inactive: true
    }, {
        title: 'Plugin - Splash Screen',
        id: 'plugin-splashscreen',
        repoName: 'cordova-plugin-splashscreen',
        jiraComponentName: 'Plugin SplashScreen',
        inactive: true
    }, {
        title: 'Plugin - Vibration',
        id: 'plugin-vibration',
        repoName: 'cordova-plugin-vibration',
        jiraComponentName: 'Plugin Vibration',
        inactive: true
    }, {
        title: 'Plugin - Statusbar',
        id: 'plugin-statusbar',
        repoName: 'cordova-plugin-statusbar',
        jiraComponentName: 'Plugin Statusbar',
        inactive: true
    }, {
        title: 'Plugin - Whitelist',
        id: 'plugin-whitelist',
        repoName: 'cordova-plugin-whitelist',
        jiraComponentName: 'Plugin Whitelist',
        inactive: true
    }, {
        title: 'Plugin - Legacy Whitelist',
        id: 'plugin-legacy-whitelist',
        repoName: 'cordova-plugin-legacy-whitelist',
        jiraComponentName: 'Plugin Legacy Whitelist',
        inactive: true
    }, {
        title: 'Plugins - Other',
        id: 'cordova-plugins',
        repoName: 'cordova-plugins',
        jiraComponentName: 'Plugins',
        inactive: true
    }, {
        title: 'Plugin - Test Framework',
        id: 'plugin-test-framework',
        repoName: 'cordova-plugin-test-framework',
        jiraComponentName: 'Plugin TestFramework',
        inactive: true
    }
];

var toolRepos = [
    {
        title: 'Cordova CLI',
        id: 'cli',
        repoName: 'cordova-cli',
        jiraComponentName: 'CLI'
    }, {
        title: 'Cordova Plugman',
        id: 'plugman',
        repoName: 'cordova-plugman',
        jiraComponentName: 'Plugman'
    }, {
        title: 'Cordova Lib',
        id: 'lib',
        repoName: 'cordova-lib',
        jiraComponentName: 'CordovaLib',
        path: 'cordova-lib'
    }, {
        title: 'Cordova Serve',
        id: 'serve',
        repoName: 'cordova-lib',
        path: 'cordova-serve',
        versionPrefix: 'serve',
        isModule: true
    }, {
        title: 'Cordova JS',
        id: 'js',
        repoName: 'cordova-js',
        jiraComponentName: 'CordovaJS'
    }, {
        title: 'Cordova Coho',
        id: 'coho',
        repoName: 'cordova-coho',
        jiraComponentName: 'Coho'
    }
];

var otherRepos = [
    {
        title: 'Cordova Medic',
        id: 'medic',
        repoName: 'cordova-medic',
        inactive: true
    }, {
        title: 'Cordova App Harness',
        id: 'app-harness',
        repoName: 'cordova-app-harness',
        inactive: true,
        jiraComponentName: 'AppHarness'
    }, {
        title: 'Cordova Labs',
        id: 'labs',
        repoName: 'cordova-labs',
        inactive: true
    }, {
        title: 'Cordova Registry Website',
        id: 'registry-web',
        repoName: 'cordova-registry-web',
        inactive: true
    }, {
        title: 'Cordova Registry DB',
        id: 'registry',
        repoName: 'cordova-registry',
        inactive: true
    }, {
        title: 'Cordova Labs',
        id: 'labs',
        repoName: 'cordova-labs',
        inactive: true
    }, {
        title: 'Apache dist/release/cordova',
        id: 'dist',
        repoName: 'cordova-dist',
        inactive: true,
        svn: 'https://dist.apache.org/repos/dist/release/cordova'
    }, {
        title: 'Apache dist/dev/cordova',
        id: 'dist/dev',
        repoName: 'cordova-dist-dev',
        inactive: true,
        svn: 'https://dist.apache.org/repos/dist/dev/cordova'
    }, {
        title: 'Apache dist/private/pmc/cordova',
        id: 'private-pmc',
        repoName: 'cordova-private-pmc',
        inactive: true,
        svn: 'https://svn.apache.org/repos/private/pmc/cordova'
    }, {
        title: 'Cordova Website',
        id: 'website',
        repoName: 'cordova-website',
        inactive: true,
        svn: 'https://svn.apache.org/repos/asf/cordova/site'
    }
];

var allRepos = platformRepos.concat(nonPlatformRepos).concat(pluginRepos).concat(toolRepos).concat(otherRepos);

var repoGroups = {
    'all': allRepos,
    'platform': platformRepos,
    'plugins': pluginRepos,
    'tools': toolRepos,
    'active-platform': platformRepos.filter(function(r) { return !r.inactive }),
    'release-repos': allRepos.filter(function(r) { return !r.inactive })
};
repoGroups['cadence'] = repoGroups['active-platform'].concat([getRepoById('mobile-spec'), getRepoById('app-hello-world')]);
repoGroups['nightly'] = repoGroups['active-platform'].concat([getRepoById('cli'), getRepoById('lib')]);

repoGroups.__defineGetter__('auto', function() {
    return allRepos.filter(function(repo) {
        return fs.existsSync(repo.repoName);
    });
});


exports.repoGroups = repoGroups;

function getRepoById(id, opt_repos) {
    // Strip cordova- prefix if it exists.
    var repos = opt_repos || allRepos;
    for (var i = 0; i < repos.length; ++i) {
        if (repos[i].id == id || repos[i].repoName == id) {
            return repos[i];
        }
    }
    return null;
}
exports.getRepoById = getRepoById;

var isInForEachRepoFunction = false;

exports.forEachRepo = function*(repos, func) {
    for (var i = 0; i < repos.length; ++i) {
        var repo = repos[i];
        var origPath = isInForEachRepoFunction ? process.cwd() : '..';

        // The crazy dance with isInForEachRepoFunction and origPath is needed
        // for nested forEachRepo calls to work. E.g repo-reset calls
        // repo-update([oneRepo]) internally.
        // TODO: rely less on process.cwd()
        isInForEachRepoFunction = true;

        //cordova-lib lives inside of a top level cordova-lib directory
        if(repo.id === 'lib'){
            origPath = origPath + '/..';
        }
        var repoDir = getRepoDir(repo);
        shelljs.cd(repoDir);

        if (shelljs.error()) {
            apputil.fatal('Repo directory does not exist: ' + repo.repoName + '. First run coho repo-clone.');
        }
        yield func(repo);

        shelljs.cd(origPath);

        isInForEachRepoFunction = !((origPath === '..')||(origPath === '../..'));
    }
}

function resolveCwdRepo() {
    var curPath = apputil.resolveUserSpecifiedPath('.');
    var prevPath;
    for (;;) {
        var value = path.basename(curPath);
        if (getRepoById(value)) {
            return value;
        }
        curPath = path.resolve(curPath, '..');
        if (curPath == prevPath) {
            apputil.fatal('Repo could not be resolved because you are not in a cordova repository.');
        }
        prevPath = curPath;
    }
}
exports.resolveCwdRepo = resolveCwdRepo;

function getRepoDir(repo) {
    var baseWorkingDir = apputil.getBaseDir();
    var repoDir = path.join(baseWorkingDir, repo.repoName);
    if (repo.path) {
        repoDir = path.join(repoDir, repo.path);
    }
    return repoDir;
}
exports.getRepoDir = getRepoDir;

function getRepoIncludePath(repo) {
    var repoPath = repo.path;
    if (!repoPath) {
        return [];
    }

    if (repo.isModule) {
        // The easy case... if it's a module, then we only include stuff in that module. Since we should already be in
        // the module folder, we can just use '.'.
        return ['--', '.'];
    }

    // The harder case - this is the main repo. We want to include the repo root folder and the folder pointed to by
    // repo.path, but exclude all module folders.
    var matchingRepos = allRepos.filter(function (testRepo) {
        return testRepo.isModule && testRepo.repoName == repo.repoName;
    });

    return matchingRepos.reduce(function (previous, moduleRepo) {
        // Note that wwe have to do the '../' stuff because we're not in the root directory of the repo.
        previous.push(':!../' + moduleRepo.path);
        return previous;
    },  ['--', '../']);
}
exports.getRepoIncludePath = getRepoIncludePath;
