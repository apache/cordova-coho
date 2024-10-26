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

require('jasmine-co').install();

const path = require('node:path');
const process = require('node:process');

const apputil = require('../src/apputil');
const repoutil = require('../src/repoutil');

const TIMEOUT = 60000;

const androidRepo = {
    title: 'Android',
    id: 'android',
    repoName: 'cordova-android',
    jiraComponentName: 'Android',
    cordovaJsPaths: ['bin/templates/project/assets/www/cordova.js'],
    remoteName: 'origin'
};

const commonRepo = {
    title: 'Cordova Common',
    id: 'common',
    packageName: 'cordova-common',
    repoName: 'cordova-lib',
    path: 'cordova-common',
    versionPrefix: 'common',
    isModule: true
};

describe('check functionality of repoutil', function () {
    it('Test#001 : getRepoDir', function () {
        spyOn(apputil, 'getBaseDir').and.returnValue('path');
        spyOn(path, 'join').and.returnValue(true);
        repoutil.getRepoDir(commonRepo);
        expect(apputil.getBaseDir.calls.count()).toEqual(1);
        expect(path.join.calls.count()).toEqual(2);
    }, TIMEOUT);

    it('Test#002 : repo listed in group, should be true', function () {
        repoutil.isInRepoGroup(androidRepo, 'platform');
        expect(repoutil.isInRepoGroup(androidRepo, 'platform')).toEqual(true);
    }, TIMEOUT);

    it('Test#003 : repo not listed in group, should be false', function () {
        repoutil.isInRepoGroup(commonRepo, 'platform');
        expect(repoutil.isInRepoGroup(commonRepo, 'platform')).toEqual(false);
    }, TIMEOUT);

    it('Test#004 : testing proper calls are made for forEachRepo function', function * () {
        spyOn(process, 'chdir').and.returnValue(true);
        spyOn(apputil, 'fatal');
        yield repoutil.forEachRepo([repoutil.getRepoById('coho')], function * () {});
        expect(process.chdir.calls.count()).toEqual(2);
        expect(apputil.fatal.calls.count()).toEqual(0);
    }, TIMEOUT);

    it('Test#005 : getRepoById should return correct repo object ', function () {
        // Return correct repo object
        repoutil.getRepoById('cordova-android');
        expect(repoutil.getRepoById('cordova-android')).toEqual(Object(
            {
                title: 'Android',
                id: 'android',
                versions: ['4.4', '5.0', '5.1', '6.0', '7.0', '7.1'],
                repoName: 'cordova-android',
                jiraComponentName: 'cordova-android',
                cordovaJsPaths: ['bin/templates/project/assets/www/cordova.js']
            }
        ));
        // Return null if opt repos are passed in
        repoutil.getRepoById('cordova-android', 'opt_repos');
        expect(repoutil.getRepoById('cordova-android', 'opt_repos')).toEqual(null);
    }, TIMEOUT);
});
