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

var versionutil = require('../src/versionutil');
require('jasmine-co').install();
var fs = require('fs');
var os = require('os');
var path = require('path');
var shell = require('shelljs');
var gitutil = require('../src/gitutil');
var TIMEOUT = 60000;
var androidRepo = { title: 'Android',
    id: 'android',
    repoName: 'cordova-android',
    jiraComponentName: 'Android',
    cordovaJsPaths: [ 'bin/templates/project/assets/www/cordova.js' ],
    remoteName: 'origin' };
var iosRepo = { title: 'iOS',
    id: 'ios',
    repoName: 'cordova-ios',
    jiraComponentName: 'iOS',
    cordovaJsPaths: ['CordovaLib/cordova.js'],
    versionFilePaths: [path.join('CordovaLib', 'VERSION')] };
var windowsRepo = { title: 'Windows',
    id: 'windows',
    repoName: 'cordova-windows',
    jiraComponentName: 'Windows 8',
    cordovaJsSrcName: 'cordova.windows.js',
    cordovaJsPaths: ['template/www/cordova.js'],
    versionFilePaths: ['VERSION'],
    packageFilePaths: ['package.json'] };
var browserRepo = { title: 'Browser',
    id: 'browser',
    repoName: 'cordova-browser',
    jiraComponentName: 'Browser',
    cordovaJsSrcName: 'cordova.browser.js',
    cordovaJsPaths: ['cordova-lib/cordova.js'] };
const testVersion = '0.0.99';

describe('versionutil', function () {
    let tmpDir;

    beforeEach(() => {
        const tmpDirTemplate = path.join(os.tmpdir(), 'cordova-coho-tests-');
        tmpDir = fs.mkdtempSync(tmpDirTemplate);

        spyOn(gitutil, 'pendingChangesExist').and.callFake(() => function * () { return true; });
        spyOn(gitutil, 'commitChanges').and.callFake(() => function * () {});
    });

    afterEach(() => {
        process.chdir(__dirname);
        shell.rm('-rf', tmpDir);
    });

    function setupPlatform (id) {
        const src = path.dirname(require.resolve(`cordova-${id}/package`));
        shell.cp('-R', src, tmpDir);
        process.chdir(path.join(tmpDir, `cordova-${id}`));
    }

    function expectTestVersioninFiles (...paths) {
        for (const p of paths) {
            const content = fs.readFileSync(path.normalize(p), { encoding: 'utf-8' });
            expect(content).toMatch(testVersion);
        }
    }

    it('Test#001 : checks that the correct android version is passed in', function * () {
        setupPlatform('android');
        yield versionutil.updateRepoVersion(androidRepo, testVersion);
        expectTestVersioninFiles(
            'bin/templates/cordova/version',
            'framework/src/org/apache/cordova/CordovaWebView.java',
            'framework/build.gradle'
        );
    }, TIMEOUT);

    it('Test#002 : checks that the correct ios version is passed in', function * () {
        setupPlatform('ios');
        yield versionutil.updateRepoVersion(iosRepo, testVersion);
        expectTestVersioninFiles('bin/templates/scripts/cordova/version');
    }, TIMEOUT);

    it('Test#003 : checks that the correct windows version is passed in', function * () {
        setupPlatform('windows');
        yield versionutil.updateRepoVersion(windowsRepo, testVersion);
        expectTestVersioninFiles('template/cordova/version');
    }, TIMEOUT);

    it('Test#004 : check that the correct browser version is passed in', function * () {
        setupPlatform('browser');
        yield versionutil.updateRepoVersion(browserRepo, testVersion);
        expectTestVersioninFiles('bin/template/cordova/version');
    }, TIMEOUT);
});
