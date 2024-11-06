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

const fs = require('node:fs');
const path = require('node:path');
const optimist = require('optimist');
const executil = require('./executil');
const flagutil = require('./flagutil');
const gitutil = require('./gitutil');
const repoutil = require('./repoutil');

const relNotesFile = 'RELEASENOTES.md';

module.exports = function * () {
    let opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerHelpFlag(opt)
        .usage('Updates release notes with commits since the most recent tag.\n' +
        '\n' +
        'Usage: $0 update-release-notes [--repo=ios]'
        )
        .options('from-tag', { desc: 'Update since a specific tag instead of the "most recent" tag' })
        .options('to-tag', { desc: 'Update to a specific tag instead of "master"' })
        .options('override-date', { desc: 'Update to a specific date instead of today.' })
        .options('last-two-tags', { desc: 'Update with the latest and previous tagged commits' });
    const argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    const repos = flagutil.computeReposFromFlag(argv.r, { includeModules: true });

    yield repoutil.forEachRepo(repos, function * (repo) {
        // TODO: we should use gitutil.summaryOfChanges here.
        const cmd = executil.ARGS('git log --topo-order --no-merges');
        cmd.push(['--pretty=format:* %s']);
        let fromTag, toTag, hasOneTag;
        hasOneTag = false;
        if (argv['last-two-tags']) {
            const last_two = (yield gitutil.findMostRecentTag(repo.versionPrefix));
            if (last_two) {
                toTag = last_two[0];
                if (last_two.length > 1) {
                    fromTag = last_two[1];
                } else {
                    hasOneTag = true;
                    fromTag = toTag;
                }
            }
        } else {
            if (argv['from-tag']) {
                fromTag = argv['from-tag'];
            } else {
                try {
                    fromTag = (yield gitutil.findMostRecentTag(repo.versionPrefix))[0];
                } catch (e) {
                    console.log(`no tags exist in ${repo.packageName}`);
                    throw Error('update-release-notes will not work');
                }
            }
            if (argv['to-tag']) {
                toTag = argv['to-tag'];
            } else {
                toTag = 'master';
            }
        }

        if (!hasOneTag) {
            cmd.push(fromTag + '..' + toTag);
        }
        let repoDesc = repo.repoName;
        if (repo.path) {
            repoDesc += '/' + repo.path;
        }
        console.log('Finding commits in ' + repoDesc + ' from tag ' + fromTag + ' to tag ' + toTag);
        const output = yield executil.execHelper(cmd.concat(repoutil.getRepoIncludePath(repo)), true);
        if (output) {
            let newVersion;
            if (toTag === 'master') {
                delete require.cache[path.join(process.cwd(), 'package.json')];
                newVersion = require(path.join(process.cwd(), 'package.json')).version;
            } else {
                newVersion = toTag;
            }
            const final_notes = yield createNotes(repo, newVersion, output, argv['override-date']);
            fs.writeFileSync(relNotesFile, final_notes, { encoding: 'utf8' });
        }
    });
};

function backtick (text, token) {
    return text.replace(new RegExp(' ' + token, 'gi'), ' `' + token + '`');
}

function bold (text, token) {
    return text.replace(new RegExp(' ' + token, 'gi'), ' **' + token + '**');
}

const GITHUB_CLOSE_COMMIT_MSG = /^\*\s+Closes?\s+\#\d+$/gi; // eslint-disable-line no-useless-escape
const VIA_COHO_COMMIT_MSG = /\(via coho\)/gi;

function * createNotes (repo, newVersion, changes, overrideDate) {
    let data = changes;

    // remove any commit logs in the form "Close #xxx", used for closing github pull requests.
    const lines = data.split('\n');
    data = lines.filter(function (line) {
        return !(
            line.match(GITHUB_CLOSE_COMMIT_MSG) ||
           line.match(VIA_COHO_COMMIT_MSG)
        );
    }).join('\n');

    // some more release note linting: enclose in backticks certain tokens
    ['plugin.xml', 'package.json', 'config.xml', 'README', 'InAppBrowser'].forEach(function (token) {
        data = backtick(data, token);
    });
    flagutil.computeReposFromFlag('platforms').map(function (r) { return r.repoName; }).forEach(function (platform_name) {
        data = backtick(data, platform_name);
    });
    // bold platform labels (with optional version numbers, too)
    const version_labels = [];
    repoutil.repoGroups.platforms.filter(function (p) {
        // first only pull out the platform repos that we have explicitly labeled with nice version strings
        return p.versions && p.versions.length;
    }).forEach(function (p) {
        // next, generate the labels for later tokenization
        p.versions.forEach(function (v) {
            version_labels.push(p.title + ' ' + v);
        });
    });
    version_labels.forEach(function (label) {
        data = bold(data, label);
    });
    repoutil.repoGroups.platforms.map(function (r) { return r.title; }).forEach(function (platform) {
        data = bold(data, platform);
    });
    // then interpolate linkified changes into existing release notes and compose the final release notes string
    let relNotesData;
    // if being run in cordova directy, cd into repo
    if (path.basename(process.cwd()) === 'cordova') {
        relNotesData = fs.readFileSync(path.join(process.cwd(), repo, relNotesFile), { encoding: 'utf8' });
    } else {
        // being run in repo directory (Eg cordova/cordova-plugin-device)
        relNotesData = fs.readFileSync(path.join(process.cwd(), relNotesFile), { encoding: 'utf8' });
    }
    const headerPos = relNotesData.indexOf('### ');
    let date;
    if (overrideDate) {
        date = new Date(overrideDate).toDateString().split(' ');
    } else {
        date = new Date().toDateString().split(' ');
    }
    return relNotesData.substr(0, headerPos) + '### ' + newVersion + ' (' + date[1] + ' ' + date[2] + ', ' + date[3] + ')\n' + data + '\n\n' + relNotesData.substr(headerPos);
}

module.exports.createNotes = createNotes;
module.exports.FILE = relNotesFile;
