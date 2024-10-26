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
const executil = require('../src/executil');
const superspawn = require('../src/superspawn');
const apputil = require('../src/apputil');
const TIMEOUT = 60000;
const androidRepo = {
    title: 'Android',
    id: 'android',
    repoName: 'cordova-android',
    jiraComponentName: 'Android',
    cordovaJsPaths: ['bin/templates/project/assets/www/cordova.js'],
    remoteName: 'origin'
};

describe('executil unit tests', function () {
    beforeEach(function () {
        spyOn(apputil, 'print').and.returnValue(true);
        spyOn(superspawn, 'spawn').and.returnValue(new Promise(() => {}));
    });

    afterEach(function () {
        apputil.print.calls.reset();
    });

    it('Test#001 : no commits are made', function () {
        executil.reportGitPushResult(androidRepo, ['master', 'null']);
        expect(apputil.print.calls.count()).toEqual(2);
        expect(apputil.print.calls.argsFor(1)[0]).toEqual('All work complete. No commits were made.');
    }, TIMEOUT);

    it("Test#002 : Don't print command, don't print output", function () {
        executil.execHelper(['git', 'symbolic-ref', 'HEAD'], true, true);
        expect(apputil.print.calls.count()).toEqual(0);
        expect(apputil.print.calls.allArgs()).toEqual([]);
        expect(superspawn.spawn.calls.argsFor(0)[2]).toEqual(Object({ stdio: 'default' }));
    }, TIMEOUT);

    it('Test#003 : Print command and output', function () {
        executil.execHelper(['git', 'symbolic-ref', 'HEAD'], false, true);
        expect(apputil.print.calls.count()).toEqual(1);
        expect(apputil.print.calls.argsFor(0)[0]).toEqual('Executing:');
        expect(apputil.print.calls.argsFor(0)[1]).toEqual('git symbolic-ref HEAD');
        expect(superspawn.spawn.calls.argsFor(0)[2]).toEqual(Object({ stdio: 'inherit' }));
    }, TIMEOUT);

    it("Test#004 : Don't print command, print output", function () {
        executil.execHelper(['git', 'symbolic-ref', 'HEAD'], 2, true);
        expect(apputil.print.calls.count()).toEqual(0);
        expect(superspawn.spawn.calls.argsFor(0)[2]).toEqual(Object({ stdio: 'inherit' }));
    }, TIMEOUT);

    it("Test#005 : Print command, don't print output", function () {
        executil.execHelper(['git', 'symbolic-ref', 'HEAD'], 3, true);
        expect(apputil.print.calls.count()).toEqual(1);
        expect(apputil.print.calls.argsFor(0)[0]).toEqual('Executing:');
        expect(apputil.print.calls.argsFor(0)[1]).toEqual('git symbolic-ref HEAD');
        expect(superspawn.spawn.calls.argsFor(0)[2]).toEqual(Object({ stdio: 'default' }));
    }, TIMEOUT);

    it('Test#006 : pretending to run', function * () {
        yield executil.execOrPretend(['git', 'symbolic-ref', 'HEAD'], 'pretend');
        expect(apputil.print.calls.count()).toEqual(1);
        expect(apputil.print.calls.argsFor(0)[0]).toEqual('PRETENDING TO RUN: git symbolic-ref HEAD');
    }, TIMEOUT);
});
