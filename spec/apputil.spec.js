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

var path = require('path');
var apputil = require('../src/apputil');

describe('apputil unit tests', function () {
    it('Test#001 : print', function () {
        spyOn(path, 'relative').and.returnValue(true);
        spyOn(console.log, 'apply').and.returnValue(true);
        apputil.print();
        expect(path.relative.calls.count()).toEqual(0);
        expect(console.log.apply.calls.count()).toEqual(1);
    });

    it('Test#002 : fatal', function () {
        spyOn(console.error, 'apply').and.returnValue(false);
        spyOn(process, 'exit').and.returnValue(false);
        apputil.fatal();
        expect(console.error.apply.calls.count()).toEqual(1);
        expect(process.exit.calls.count()).toEqual(1);
    });

    it('Test#003 : initWorkingDir', function () {
        spyOn(console, 'log').and.returnValue(false);
        apputil.initWorkingDir(true);
        expect(console.log.calls.count()).toEqual(1);
        expect(console.log.calls.allArgs()).toMatch('Running from');
    });
});
