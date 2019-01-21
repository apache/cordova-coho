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
        versions: ['4.4', '5.0', '5.1', '6.0', '7.0', '7.1'],
        id: 'android',
        repoName: 'cordova-android',
        jiraComponentName: 'cordova-android',
        cordovaJsPaths: ['bin/templates/project/assets/www/cordova.js']
    }, {
        title: 'iOS',
        versions: ['9.0', '9.1', '9.2', '9.3', '10.0', '10.1', '10.2', '10.3'],
        id: 'ios',
        repoName: 'cordova-ios',
        jiraComponentName: 'cordova-ios',
        cordovaJsPaths: ['CordovaLib/cordova.js'],
        versionFilePaths: [path.join('CordovaLib', 'VERSION')]
    }, {
        title: 'Windows',
        id: 'windows',
        repoName: 'cordova-windows',
        jiraComponentName: 'cordova-windows',
        cordovaJsSrcName: 'cordova.windows.js',
        cordovaJsPaths: ['template/www/cordova.js'],
        versionFilePaths: ['VERSION'],
        packageFilePaths: ['package.json']
    }, {
        title: 'Mac OSX',
        id: 'osx',
        repoName: 'cordova-osx',
        jiraComponentName: 'cordova-osx',
        cordovaJsPaths: ['CordovaLib/cordova.js'],
        versionFilePaths: [path.join('CordovaLib', 'VERSION')]
    }, {
        title: 'Browser',
        id: 'browser',
        repoName: 'cordova-browser',
        jiraComponentName: 'cordova-browser',
        cordovaJsSrcName: 'cordova.browser.js',
        cordovaJsPaths: ['cordova-lib/cordova.js']
    }, {
        title: 'Electron',
        id: 'electron',
        repoName: 'cordova-electron',
        jiraComponentName: 'cordova-electron',
        cordovaJsSrcName: 'cordova.electron.js',
        cordovaJsPaths: ['cordova-lib/cordova.js']
    }
];

var nonPlatformRepos = [
    {
        title: 'Docs',
        id: 'docs',
        repoName: 'cordova-docs',
        jiraComponentName: 'cordova-docs'
    }, {
        title: 'MobileSpec',
        id: 'mobile-spec',
        repoName: 'cordova-mobile-spec',
        jiraComponentName: 'cordova-mobile-spec'
    }, {
        title: 'Hello World App',
        id: 'app-hello-world',
        repoName: 'cordova-app-hello-world',
        jiraComponentName: 'cordova-app-hello-world'
    }
];

var pluginRepos = [
    {
        title: 'Plugin - Battery Status',
        id: 'plugin-battery-status',
        repoName: 'cordova-plugin-battery-status',
        jiraComponentName: 'cordova-plugin-battery-status'
    }, {
        title: 'Plugin - Camera',
        id: 'plugin-camera',
        repoName: 'cordova-plugin-camera',
        jiraComponentName: 'cordova-plugin-camera'
    }, {
        title: 'Plugin - Device',
        id: 'plugin-device',
        repoName: 'cordova-plugin-device',
        jiraComponentName: 'cordova-plugin-device'
    }, {
        title: 'Plugin - Dialogs',
        id: 'plugin-dialogs',
        repoName: 'cordova-plugin-dialogs',
        jiraComponentName: 'cordova-plugin-dialogs'
    }, {
        title: 'Plugin - File',
        id: 'plugin-file',
        repoName: 'cordova-plugin-file',
        jiraComponentName: 'cordova-plugin-file'
    }, {
        title: 'Plugin - Geolocation',
        id: 'plugin-geolocation',
        repoName: 'cordova-plugin-geolocation',
        jiraComponentName: 'cordova-plugin-geolocation'
    }, {
        title: 'Plugin - InAppBrowser',
        id: 'plugin-inappbrowser',
        repoName: 'cordova-plugin-inappbrowser',
        jiraComponentName: 'cordova-plugin-inappbrowser'
    }, {
        title: 'Plugin - Media',
        id: 'plugin-media',
        repoName: 'cordova-plugin-media',
        jiraComponentName: 'cordova-plugin-media'
    }, {
        title: 'Plugin - Media Capture',
        id: 'plugin-media-capture',
        repoName: 'cordova-plugin-media-capture',
        jiraComponentName: 'cordova-plugin-media-capture'
    }, {
        title: 'Plugin - Network Information',
        id: 'plugin-network-information',
        repoName: 'cordova-plugin-network-information',
        jiraComponentName: 'cordova-plugin-network-information'
    }, {
        title: 'Plugin - Screen Orientation',
        id: 'plugin-screen-orientation',
        repoName: 'cordova-plugin-screen-orientation',
        jiraComponentName: 'cordova-plugin-screen-orientation'
    }, {
        title: 'Plugin - Splash Screen',
        id: 'plugin-splashscreen',
        repoName: 'cordova-plugin-splashscreen',
        jiraComponentName: 'cordova-plugin-splashscreen'
    }, {
        title: 'Plugin - Statusbar',
        id: 'plugin-statusbar',
        repoName: 'cordova-plugin-statusbar',
        jiraComponentName: 'cordova-plugin-statusbar'
    }, {
        title: 'Plugin - Vibration',
        id: 'plugin-vibration',
        repoName: 'cordova-plugin-vibration',
        jiraComponentName: 'cordova-plugin-vibration'
    }, {
        title: 'Plugin - Whitelist',
        id: 'plugin-whitelist',
        repoName: 'cordova-plugin-whitelist',
        jiraComponentName: 'cordova-plugin-whitelist'
    }, {
        title: 'Plugin - WKWebView Engine',
        id: 'plugin-wkwebview-engine',
        repoName: 'cordova-plugin-wkwebview-engine',
        jiraComponentName: 'cordova-plugin-wkwebview-engine'
    }, {
        title: 'Plugins - Other',
        id: 'cordova-plugins',
        repoName: 'cordova-plugins',
        jiraComponentName: 'cordova-plugins',
        inactive: true
    }, {
        title: 'Plugin - Test Framework',
        id: 'plugin-test-framework',
        repoName: 'cordova-plugin-test-framework',
        jiraComponentName: 'cordova-plugin-test-framework'
    }
];

var toolRepos = [
    {
        title: 'Cordova CLI',
        id: 'cli',
        packageName: 'cordova',
        repoName: 'cordova-cli',
        jiraComponentName: 'cordova-cli'
    }, {
        title: 'Cordova Plugman',
        id: 'plugman',
        packageName: 'plugman',
        repoName: 'cordova-plugman',
        jiraComponentName: 'cordova-plugman'
    }, {
        title: 'Cordova Lib',
        id: 'lib',
        repoName: 'cordova-lib',
        jiraComponentName: 'cordova-lib'
    }, {
        title: 'Cordova Serve',
        id: 'serve',
        packageName: 'cordova-serve',
        repoName: 'cordova-serve',
        jiraComponentName: 'cordova-serve'
    }, {
        title: 'Cordova Common',
        id: 'common',
        packageName: 'cordova-common',
        jiraComponentName: 'cordova-common',
        repoName: 'cordova-common'
    }, {
        title: 'Cordova Fetch',
        id: 'fetch',
        packageName: 'cordova-fetch',
        repoName: 'cordova-fetch',
        jiraComponentName: 'cordova-fetch'
    }, {
        title: 'Cordova Create',
        id: 'create',
        packageName: 'cordova-create',
        repoName: 'cordova-create',
        jiraComponentName: 'cordova-create'
    }, {
        title: 'Cordova JS',
        id: 'js',
        repoName: 'cordova-js',
        jiraComponentName: 'cordova-js'
    }, {
        title: 'Cordova Coho',
        id: 'coho',
        repoName: 'cordova-coho',
        jiraComponentName: 'cordova-coho'
    }, {
        title: 'Cordova Node Xcode',
        id: 'node-xcode',
        repoName: 'cordova-node-xcode',
        jiraComonentName: 'node-xcode'
    }
];

var otherRepos = [
    {
        title: 'Cordova Paramedic',
        id: 'paramedic',
        repoName: 'cordova-paramedic',
        jiraComponentName: 'cordova-paramedic',
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
        jiraComponentName: 'cordova-website',
        inactive: true,
        svn: 'https://svn.apache.org/repos/asf/cordova/site'
    }
];

var allRepos = platformRepos.concat(nonPlatformRepos,
    pluginRepos,
    toolRepos,
    otherRepos);

var repoGroups = {
    'all': allRepos,
    'platform': platformRepos,
    'platforms': platformRepos,
    'plugin': pluginRepos,
    'plugins': pluginRepos,
    'tools': toolRepos,
    'active-platform': platformRepos.filter(function (r) { return !r.inactive; }),
    'active-platforms': platformRepos.filter(function (r) { return !r.inactive; }),
    'active-plugins': pluginRepos.filter(function (r) { return !r.inactive; }),
    'release-repos': allRepos.filter(function (r) { return !r.inactive; })
};
repoGroups['cadence'] = repoGroups['active-platform'].concat([getRepoById('mobile-spec'), getRepoById('app-hello-world')]);
repoGroups['nightly'] = repoGroups['active-platform'].concat([getRepoById('cli'), getRepoById('lib')]);

repoGroups.__defineGetter__('auto', function () {
    return allRepos.filter(function (repo) {
        return fs.existsSync(repo.repoName);
    });
});

exports.repoGroups = repoGroups;

function isInRepoGroup (repoToCheck, groupName) {
    var repos = repoGroups[groupName];
    if (!repos) return false;
    return repos.some(function (repo) {
        return repo.id === repoToCheck.id;
    });
}
exports.isInRepoGroup = isInRepoGroup;

function getRepoById (id, opt_repos) {
    // Strip cordova- prefix if it exists.
    var repos = opt_repos || allRepos;
    for (var i = 0; i < repos.length; ++i) {
        if (repos[i].id === id || repos[i].packageName === id || repos[i].repoName === id) {
            return repos[i];
        }
    }
    return null;
}
exports.getRepoById = getRepoById;

var isInForEachRepoFunction = false;

exports.forEachRepo = function * (repos, func) {
    for (var i = 0; i < repos.length; ++i) {
        var repo = repos[i];
        var origPath = isInForEachRepoFunction ? process.cwd() : '..';

        // The crazy dance with isInForEachRepoFunction and origPath is needed
        // for nested forEachRepo calls to work. E.g repo-reset calls
        // repo-update([oneRepo]) internally.
        // TODO: rely less on process.cwd()
        isInForEachRepoFunction = true;

        // cordova-lib lives inside of a top level cordova-lib directory
        if (repo.id === 'lib') {
            origPath = origPath + '/..';
        }
        var repoDir = getRepoDir(repo);
        shelljs.cd(repoDir);

        if (shelljs.error()) {
            apputil.fatal('Repo directory does not exist: ' + repo.repoName + '. First run coho repo-clone.');
        }
        yield func(repo);

        shelljs.cd(origPath);

        isInForEachRepoFunction = !((origPath === '..') || (origPath === '../..'));
    }
};

function resolveCwdRepo () {
    var curPath = apputil.resolveUserSpecifiedPath('.');
    var prevPath;
    for (;;) {
        var value = path.basename(curPath);
        if (getRepoById(value)) {
            return value;
        }
        curPath = path.resolve(curPath, '..');
        if (curPath === prevPath) {
            apputil.fatal('Repo could not be resolved because you are not in a cordova repository.');
        }
        prevPath = curPath;
    }
}
exports.resolveCwdRepo = resolveCwdRepo;

function getRepoDir (repo) {
    var baseWorkingDir = apputil.getBaseDir();
    var repoDir = path.join(baseWorkingDir, repo.repoName);
    if (repo.path) {
        repoDir = path.join(repoDir, repo.path);
    }
    return repoDir;
}
exports.getRepoDir = getRepoDir;

function getRepoIncludePath (repo) {
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
        return testRepo.isModule && testRepo.repoName === repo.repoName;
    });

    return matchingRepos.reduce(function (previous, moduleRepo) {
        // Note that wwe have to do the '../' stuff because we're not in the root directory of the repo.
        previous.push(':!../' + moduleRepo.path);
        return previous;
    }, ['--', '../']);
}
exports.getRepoIncludePath = getRepoIncludePath;
