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
var path = require('path');
var shell = require('shelljs');
var xml2js = require('xml2js');
var repoutil = require('../src/repoutil');
var executil = require('../src/executil');
var gitutil = require('../src/gitutil');
var apputil = require('../src/apputil');
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

describe('versionutil', function () {
    beforeEach(function * () {
        spyOn(fs, 'writeFileSync').and.returnValue(true);
        spyOn(fs, 'readFileSync').and.returnValue('{}');
        spyOn(xml2js, 'parseString').and.returnValue(true);
        spyOn(fs, 'existsSync').and.returnValue(true);
        spyOn(shell, 'sed').and.returnValue(true);
        spyOn(apputil, 'print').and.returnValue(true);
        spyOn(repoutil, 'isInRepoGroup').and.returnValue(true);
        spyOn(gitutil, 'pendingChangesExist').and.callFake(function () {
            return function * () { return true; };
        });
        spyOn(executil, 'execHelper').and.callFake(function () {
            return function * () { return true; };
        });
    });

    afterEach(function () {
        fs.writeFileSync.calls.reset();
        fs.readFileSync.calls.reset();
        fs.existsSync.calls.reset();
        shell.sed.calls.reset();
        apputil.print.calls.reset();
        repoutil.isInRepoGroup.calls.reset();
        gitutil.pendingChangesExist.calls.reset();
        executil.execHelper.calls.reset();
    });

    it('Test#001 : checks that the correct android version is passed in', function * () {
        yield versionutil.updateRepoVersion(androidRepo, '6.4.0-dev');
        // Check call count
        expect(fs.writeFileSync.calls.count()).toEqual(2);
        expect(fs.existsSync.calls.count()).toEqual(4);
        expect(fs.readFileSync.calls.count()).toEqual(3);
        expect(repoutil.isInRepoGroup.calls.count()).toEqual(2);
        expect(repoutil.isInRepoGroup.calls.count()).toEqual(2);
        expect(gitutil.pendingChangesExist.calls.count()).toEqual(4);
        expect(executil.execHelper.calls.count()).toEqual(1);
        expect(apputil.print.calls.count()).toEqual(0);
        expect(shell.sed.calls.count()).toEqual(5);
        // Check that args are correct
        expect(shell.sed.calls.argsFor(0)[2]).toEqual('CORDOVA_VERSION = "6.4.0-dev";');
        expect(shell.sed.calls.argsFor(1)[2]).toEqual('VERSION = "6.4.0-dev";');
        expect(shell.sed.calls.argsFor(2)[2]).toEqual("version = '6.4.0-dev'");
        expect(shell.sed.calls.argsFor(3)[2]).toEqual("vcsTag = '6.4.0-dev'");
        expect(shell.sed.calls.argsFor(4)[2]).toContain("name = '6.4.0-dev");
    }, TIMEOUT);

    it('Test#002 : checks that the correct ios version is passed in', function * () {
        yield versionutil.updateRepoVersion(iosRepo, '4.2.0-dev');
        // Check call count
        expect(fs.writeFileSync.calls.count()).toEqual(2);
        expect(fs.existsSync.calls.count()).toEqual(4);
        expect(repoutil.isInRepoGroup.calls.count()).toEqual(2);
        expect(fs.readFileSync.calls.count()).toEqual(3);
        expect(gitutil.pendingChangesExist.calls.count()).toEqual(4);
        expect(shell.sed.calls.count()).toEqual(1);
        expect(apputil.print.calls.count()).toEqual(0);
        expect(executil.execHelper.calls.count()).toEqual(1);
        // Check that args are correct
        expect(shell.sed.calls.argsFor(0)[2]).toEqual('VERSION="4.2.0-dev";');
    }, TIMEOUT);

    it('Test#003 : checks that the correct windows version is passed in', function * () {
        yield versionutil.updateRepoVersion(windowsRepo, '4.5.0-dev');
        // Check call count
        expect(fs.writeFileSync.calls.count()).toEqual(2);
        expect(fs.existsSync.calls.count()).toEqual(5);
        expect(repoutil.isInRepoGroup.calls.count()).toEqual(2);
        expect(gitutil.pendingChangesExist.calls.count()).toEqual(4);
        expect(fs.readFileSync.calls.count()).toEqual(3);
        expect(shell.sed.calls.count()).toEqual(1);
        expect(apputil.print.calls.count()).toEqual(0);
        expect(executil.execHelper.calls.count()).toEqual(1);
        // Check that args are correct
        expect(shell.sed.calls.argsFor(0)[2]).toEqual('VERSION = "4.5.0-dev";');
    }, TIMEOUT);

    it('Test#004 : check that the correct browser version is passed in', function * () {
        yield versionutil.updateRepoVersion(browserRepo, '4.1.0-dev');
        // Check call count
        expect(fs.writeFileSync.calls.count()).toEqual(2);
        expect(fs.existsSync.calls.count()).toEqual(5);
        expect(repoutil.isInRepoGroup.calls.count()).toEqual(2);
        expect(gitutil.pendingChangesExist.calls.count()).toEqual(4);
        expect(fs.readFileSync.calls.count()).toEqual(3);
        expect(shell.sed.calls.count()).toEqual(1);
        expect(apputil.print.calls.count()).toEqual(0);
        expect(executil.execHelper.calls.count()).toEqual(1);
        // Check that args are correct
        expect(shell.sed.calls.argsFor(0)[2]).toEqual('VERSION = "4.1.0-dev";');
    }, TIMEOUT);
});
