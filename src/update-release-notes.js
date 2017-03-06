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

var fs = require('fs');
var path = require('path');
var stream = require('stream');
var optimist = require('optimist');
var executil = require('./executil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');
var linkify = require('jira-linkify');
var co_stream = require('co-stream');

var relNotesFile = 'RELEASENOTES.md';

module.exports = function*() {
    var meEmail = yield executil.execHelper(executil.ARGS('git config user.email'), true);
    var opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerHelpFlag(opt)
        .usage('Updates release notes with commits since the most recent tag.\n' +
        '\n' +
        'Usage: $0 update-release-notes [--repo=ios]'
        )
        .options('from-tag', {desc: 'Update since a specific tag instead of the "most recent" tag'})
        .options('to-tag', {desc: 'Update to a specific tag instead of "master"'})
        .options('override-date', {desc: 'Update to a specific date instead of today.'})
        .options('last-two-tags', {desc: 'Update with the latest and previous tagged commits'});
    argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    var repos = flagutil.computeReposFromFlag(argv.r, {includeModules: true});

    yield repoutil.forEachRepo(repos, function*(repo) {
        // TODO: we should use gitutil.summaryOfChanges here.
        var cmd = executil.ARGS('git log --topo-order --no-merges');
        cmd.push(['--pretty=format:* %s']);
        var fromTag, toTag, hasOneTag;
        hasOneTag = false;
        if (argv['last-two-tags']) {
            var last_two = (yield gitutil.findMostRecentTag(repo.versionPrefix));
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
            if (argv['from-tag']){
                fromTag = argv['from-tag'];
            } else {
                fromTag = (yield gitutil.findMostRecentTag(repo.versionPrefix))[0];
            }
            if (argv['to-tag']){
                toTag = argv['to-tag'];
            } else {
                toTag = 'master';
            }
        }

        if (!hasOneTag) {
            cmd.push(fromTag + '..' + toTag);
        }
        var repoDesc = repo.repoName;
        if (repo.path) {
            repoDesc += '/' + repo.path;
        }
        console.log('Finding commits in ' + repoDesc + ' from tag ' + fromTag + ' to tag ' + toTag);
        var output = yield executil.execHelper(cmd.concat(repoutil.getRepoIncludePath(repo)), true);
        if (output) {
            var newVersion;
            if (toTag === 'master') {
                delete require.cache[path.join(process.cwd(), 'package.json')];
                newVersion = require(path.join(process.cwd(), 'package.json')).version;
            } else {
                newVersion = toTag;
            }
            var final_notes = yield createNotes(repo, newVersion, output, argv['override-date']);
            fs.writeFileSync(relNotesFile, final_notes, {encoding: 'utf8'});
            return linkify.file(relNotesFile);
        }
    });
};

function backtick(text, token) {
    return text.replace(new RegExp(" " + token, "gi"), " `" + token + "`");
}

function bold(text, token) {
    return text.replace(new RegExp(" " + token, "gi"), " **" + token + "**");
}

function *createNotes(repo, newVersion, changes, overrideDate) {
    // pump changes through JIRA linkifier first through a stream pipe
	var transformer = linkify.stream("CB");
	var read = new stream.Readable();
	read._read = function(){};// noop
	read.push(changes);
	read.push(null);
	var write = new stream.Writable();
	var data = '';
	write._write = function(chunk, encoding, done) {
		data += chunk.toString();
		done();
	}
	read.pipe(transformer).pipe(write);
    yield co_stream.wait(write); // wait for the writable stream to finish/end
    // some more release note linting: enclose in backticks certain tokens
    data = backtick(data, 'plugin.xml');
    flagutil.computeReposFromFlag('platforms').map(function(r) { return r.repoName; }).forEach(function(platform_name) {
        data = backtick(data, platform_name);
    });
    var special_plugin_names = ['InAppBrowser'];
    special_plugin_names.forEach(function(name) {
        data = backtick(data, name);
    });
    // bold platform labels (with optional version numbers, too)
    var version_labels = [];
    repoutil.repoGroups.platforms.filter(function(p) {
        // first only pull out the platform repos that we have explicitly labeled with nice version strings
        return p.versions && p.versions.length;
    }).forEach(function(p) {
        // next, generate the labels for later tokenization
        p.versions.forEach(function(v) {
            version_labels.push(p.title + ' ' + v);
        });
    });
    version_labels.forEach(function(label) {
        data = bold(data, label);
    });
    repoutil.repoGroups.platforms.map(function(r) { return r.title; }).forEach(function(platform) {
        data = bold(data, platform);
    });
    // then interpolate linkified changes into existing release notes and compose the final release notes string
    var relNotesData = fs.readFileSync(path.join(process.cwd(), repo, relNotesFile), {encoding: 'utf8'});
    var headerPos = relNotesData.indexOf('### ');
    var date;
    if (overrideDate) {
        date = new Date(overrideDate).toDateString().split(' ');
    } else {
        date = new Date().toDateString().split(' ');
    }
    return relNotesData.substr(0, headerPos) + "### " + newVersion + ' (' + date[1] + ' ' + date[2] + ', ' + date[3] + ')\n' + data + '\n\n' + relNotesData.substr(headerPos);
}

module.exports.createNotes = createNotes;
module.exports.FILE = relNotesFile;
