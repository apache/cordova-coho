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
const fs = require('node:fs');
const repoutil = require('../src/repoutil');
const auditLicenseHeaders = require('../src/audit-license-headers');

describe('audit-license-headers', () => {
    describe('scrubRepos', () => {
        it('basic operation', function * () {
            spyOn(console, 'log');

            fs.readdirSync(path.join(__dirname, '..'))
                .filter((filename) => filename.startsWith('apache-rat-'))
                .forEach((filename) => {
                    fs.rmSync(filename, { recursive: true, force: true });
                });

            const cohoRepo = repoutil.getRepoById('coho');
            yield auditLicenseHeaders.scrubRepos([cohoRepo], true);
        }, 60000);
    });
});
