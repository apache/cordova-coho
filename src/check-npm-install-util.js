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

try {
    // Ensure npm install has been run.
    Object.keys(require('../package').dependencies).forEach(require);
} catch (e) {
    const path = require('path'); // Built-in Node.js module
    console.log(
       'Please run "npm install" from this directory:\n\t' +
        path.join(__dirname, '..')); // correct path
    process.exit(2);
}

module.exports = {};
