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
const gitutilJS = require('../src/gitutil');
const TIMEOUT = 60000;

describe('gitutil unit tests', function () {
    beforeEach(function * () {
        spyOn(executil, 'execHelper').and.callFake(function () {
            return function * () { return true; };
        });
        spyOn(executil, 'ARGS').and.callFake(function () {
            return function * () { return true; };
        });
    });
    it('Test#001 : validate the version that is passed in', function * () {
        yield gitutilJS.tagExists('6.3.0');
        expect(executil.execHelper.calls.count()).toEqual(1);
        expect(executil.ARGS.calls.count()).toEqual(1);
        expect(executil.ARGS.calls.argsFor(0)[0]).toEqual('git tag --list 6.3.0');
    }, TIMEOUT);

    it('Test#003 : validate pending changes', function * () {
        yield gitutilJS.pendingChangesExist();
        expect(executil.execHelper.calls.count()).toEqual(1);
        expect(executil.ARGS.calls.count()).toEqual(1);
        expect(executil.ARGS.calls.argsFor(0)[0]).toEqual('git status --porcelain');
    }, TIMEOUT);

    it('Test#004 : resetting from origin', function * () {
        yield gitutilJS.resetFromOrigin();
        expect(executil.execHelper.calls.count()).toEqual(1);
        expect(executil.ARGS.calls.count()).toEqual(1);
        expect(executil.ARGS.calls.argsFor(0)[0]).toEqual('git reset --hard origin/master');
    }, TIMEOUT);

    it('Test#005 : git clean', function * () {
        yield gitutilJS.gitClean();
        expect(executil.execHelper.calls.count()).toEqual(1);
        expect(executil.ARGS.calls.count()).toEqual(1);
        expect(executil.ARGS.calls.argsFor(0)[0]).toEqual('git clean -d -f');
    }, TIMEOUT);
});
