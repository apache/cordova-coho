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

var optimist = require('optimist');
var request = require('request');
var apputil = require('./apputil');
var flagutil = require('./flagutil');
var repoutil = require('./apputil');

var GITHUB_API_URL = "https://api.github.com/";
var GITHUB_ORGANIZATION = "apache";
var commentFailed = false;

function addLastCommentInfo(repo, pullRequests, callback) {
    var remaining = pullRequests.length;
    if (remaining === 0) {
        callback();
    }
    pullRequests.forEach(function(pullRequest) {
        // review_comments_url is always empty, so resort to scraping.
        request.get({ url: 'https://github.com/apache/' + repo + '/pull/' + pullRequest.number, headers: { 'User-Agent': 'Cordova Coho' }}, function(err, res, payload) {
            if (err) {
                if (!commentFailed) {
                    commentFailed = true;
                    console.warn('Pull request scrape request failed: ' + err);
                }
            } else {
                var m = /[\s\S]*timeline-comment-header[\s\S]*?"author".*?>(.*?)</.exec(payload);
                pullRequest.lastUpdatedBy = m && m[1] || '';
            }
            if (--remaining === 0) {
                callback();
            }
        });
    });
}

function listGitHubPullRequests(repo, maxAge, hideUser, callback) {
    var url = GITHUB_API_URL + 'repos/' + GITHUB_ORGANIZATION + '/' + repo + '/pulls';

    request.get({ url: url, headers: { 'User-Agent': 'Cordova Coho' }}, function(err, res, pullRequests) {
        if (err) {
            apputil.fatal('Error getting pull requests from GitHub: ' + err);
        } else if (!pullRequests) {
            apputil.fatal('Error: GitHub returned no pull requests');
        } else if (res.headers['x-ratelimit-remaining'] && res.headers['x-ratelimit-remaining'] == 0) {
            var resetEpoch = new Date(res.headers['x-ratelimit-reset'] * 1000);
            var expiration = resetEpoch.getHours() + ":" + resetEpoch.getMinutes() + ":" + resetEpoch.getSeconds();
            apputil.fatal('Error: GitHub rate limit exceeded, wait till ' + expiration + ' before trying again.\n' +
                'See http://developer.github.com/v3/#rate-limiting for details.');
        }

        pullRequests = JSON.parse(pullRequests);
        var origCount = pullRequests.length;

        pullRequests = pullRequests.filter(function(p) {
            var updatedDate = new Date(p.updated_at);
            var daysAgo = Math.round((new Date() - updatedDate) / (60 * 60 * 24 * 1000));
            return daysAgo < maxAge;
        });
        var countAfterDateFilter = pullRequests.length;

        addLastCommentInfo(repo, pullRequests, next);

        function next() {
            if (hideUser) {
                pullRequests = pullRequests.filter(function(p) {
                    return p.lastUpdatedBy != hideUser;
                });
            }
            var count = pullRequests.length;

            pullRequests.sort(function(a,b) {return (a.updated_at > b.updated_at) ? -1 : ((b.updated_at > a.updated_at) ? 1 : 0);} );

            var countMsg = count + ' Pull Requests';
            if (countAfterDateFilter !== origCount || count !== countAfterDateFilter) {
                countMsg += ' (plus ';
            }
            if (countAfterDateFilter !== origCount) {
                countMsg += (origCount - countAfterDateFilter) + ' old';
                if (count !== countAfterDateFilter) {
                    countMsg += ', ';
                }
            }
            if (count !== countAfterDateFilter) {
                countMsg += (countAfterDateFilter - count) + ' stale';
            }
            if (countAfterDateFilter !== origCount || count !== countAfterDateFilter) {
                countMsg += ')';
            }
            console.log('\x1B[31m========= ' + repo + ': ' + countMsg + '. =========\x1B[39m');

            pullRequests.forEach(function(pullRequest) {
                var updatedDate = new Date(pullRequest.updated_at);
                var daysAgo = Math.round((new Date() - updatedDate) / (60 * 60 * 24 * 1000));
                console.log('\x1B[33m-----------------------------------------------------------------------------------------------\x1B[39m');
                console.log(pullRequest.user.login + ': ' + pullRequest.title + ' (\x1B[31m' + (pullRequest.lastUpdatedBy || '<no comments>') + ' ' + daysAgo + ' days ago\x1B[39m)');
                console.log('\x1B[33m-----------------------------------------------------------------------------------------------\x1B[39m');
                console.log('* ' + pullRequest.html_url);
                // console.log('To merge: curl "' + pullRequest.patch_url + '" | git am');
                if (!pullRequest.head.repo) {
                    console.log('NO REPO EXISTS!');
                } else {
                    console.log('To merge: git pull ' + pullRequest.head.repo.clone_url + ' ' + pullRequest.head.ref);
                }
                if (pullRequest.body) {
                    console.log(pullRequest.body);
                }
                console.log('');
            });
            callback();
        }
    });
}

function *listPullRequestsCommand() {
    var opt = flagutil.registerHelpFlag(optimist);
    opt = flagutil.registerRepoFlag(opt)
        .options('max-age', {
            desc: 'Don\'t show pulls older than this (in days)',
            type: 'number',
            default: 1000
         })
        .options('hide-user', {
            desc: 'Hide PRs where the last comment\'s is by this github user.',
            type: 'string'
         });
    opt.usage('Reports what GitHub pull requests are open for the given repositories.\n' +
               '\n' +
               'Example usage: $0 list-pulls --hide-user="agrieve" | tee pulls.list | less -R\n' +
               'Example usage: $0 list-pulls --max-age=365 --repo=.\n' +
               '\n' +
               'Please note that GitHub rate limiting applies. See http://developer.github.com/v3/#rate-limiting for details.\n');
    var argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    var repos = flagutil.computeReposFromFlag(argv.r)

    function next() {
        if (repos.length) {
            var repo = repos.shift();
            listGitHubPullRequests(repo.repoName, argv['max-age'], argv['hide-user'], next);
        }
    }
    next();
}

module.exports = listPullRequestsCommand;
