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

var repoutil = require('./repoutil');

module.exports = function * (argv) {
    console.log('Valid values for the --repo flag:');
    console.log('');
    console.log('Repositories:');
    repoutil.repoGroups.all.forEach(function (repo) {
        console.log('    ' + repo.id);
    });
    console.log('');
    console.log('Repository Groups:');
    var groupNames = Object.keys(repoutil.repoGroups);
    groupNames.sort();
    groupNames.forEach(function (groupName) {
        console.log('    ' + groupName + ' (' + repoutil.repoGroups[groupName].map(function (repo) { return repo.id; }).join(', ') + ')');
    });
    process.exit(0);
};
