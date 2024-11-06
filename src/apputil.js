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

const path = require('node:path');
const { styleText } = require('node:util');

const origWorkingDir = path.resolve(process.cwd());
let baseWorkingDir = origWorkingDir;

exports.resolveUserSpecifiedPath = function (p) {
    return path.resolve(origWorkingDir, p);
};

exports.initWorkingDir = function (chdir) {
    if (chdir) {
        const newDir = path.resolve(__dirname, '..', '..');
        process.chdir(newDir);
        baseWorkingDir = newDir;
    }
    console.log('Running from ' + baseWorkingDir + ' (use `-g` to run in current working directory)');
};

exports.getBaseDir = function () {
    return baseWorkingDir;
};

exports.fatal = function () {
    console.error.apply(console, arguments);
    process.exit(1);
};

exports.prefixLength = 30;

exports.print = function () {
    let newArgs = Array.prototype.slice.call(arguments);
    // Prefix any prints() to distinguish them from command output.
    if (newArgs.length > 1 || newArgs[0]) {
        let curDir = path.relative(baseWorkingDir, process.cwd());
        curDir = curDir ? curDir + '/' : './';
        let banner = ' =';
        const PREFIX_LEN = exports.prefixLength;
        if (curDir.length < PREFIX_LEN) {
            banner += new Array(PREFIX_LEN - curDir.length + 1).join('=');
        }
        const prefix = styleText(['magenta', 'bold'], curDir) + styleText(['yellow'], banner);
        newArgs.unshift(prefix);
        newArgs = newArgs.map(function (val) { return val.replace(/\n/g, '\n' + prefix + ' '); });
    }

    console.log.apply(console, newArgs);
};
