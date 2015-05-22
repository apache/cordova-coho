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
var apputil = require('./apputil');
var repoutil = require('./repoutil');

exports.registerHelpFlag = function(opt) {
    return opt.options('h', {
        alias: 'help',
        desc: 'Shows help information.'
    });
}

exports.registerRepoFlag = function(opt) {
    return opt.options('r', {
        alias: 'repo',
        desc: 'Which repos to operate on. Multiple flags allowed. This can be repo IDs or repo groups. Use the list-repos command see valid values.',
        default: 'auto'
    });
}

exports.registerDepthFlag = function(opt) {
    return opt.options('depth', {
        desc: 'Value of --depth flag for git repos.'
    });
}

exports.computeReposFromFlag = function(flagValue, includeSvn) {
    if (flagValue === 'auto') {
        console.log('No repos specified - using repo in CWD');
        flagValue = '.';
    }
    var values = flagValue === true ? [] : Array.isArray(flagValue) ? flagValue : [flagValue];
    var ret = [];
    var addedIds = {};
    function addRepo(repo) {
        if (!addedIds[repo.id]) {
            addedIds[repo.id] = true;
            ret.push(repo);
        }
    }
    values.forEach(function(value) {
        if (value == '.') {
            value = repoutil.resolveCwdRepo();
        }
        var repo = repoutil.getRepoById(value);
        var group = repoutil.repoGroups[value];
        if (repo) {
            addRepo(repo);
        } else if (group) {
            group.forEach(addRepo);
        } else {
            apputil.fatal('Invalid repo value: ' + value + '\nUse the list-repos command to see value values.');
        }
    });
    if (!includeSvn) {
        var hadSvn = false;
        ret = ret.filter(function(r) {
            hadSvn = hadSvn || !!r.svn;
            return !r.svn;
        });
        if (hadSvn && !(values.length == 1 && values[0] == 'auto')) {
            console.warn('Skipping one or more non-git repos');
        }
    }

    return ret;
}

exports.validateVersionString = function(version, opt_allowNonSemver) {
    var pattern = opt_allowNonSemver ? /^\d+\.\d+\.\d+(-?rc\d)?$/ : /^\d+\.\d+\.\d+(-rc\d)?$/;
    if (!pattern.test(version)) {
        apputil.fatal('Versions must be in the form #.#.#-[rc#]');
    }
    return version;
}


