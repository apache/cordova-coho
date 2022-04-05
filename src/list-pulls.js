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

const optimist = require('optimist');
const request = require('request');
const apputil = require('./apputil');
const flagutil = require('./flagutil');

// Set env variable CORDOVA_GIT_ACCOUNT to <username>:<password> or <api-token> to avoid hitting GitHub rate limits.
const GITHUB_ACCOUNT = process.env.CORDOVA_GIT_ACCOUNT ? process.env.CORDOVA_GIT_ACCOUNT + '@' : '';
const GITHUB_API_URL = 'https://' + GITHUB_ACCOUNT + 'api.github.com/';
const GITHUB_ORGANIZATION = 'apache';
let commentFailed = false;

function addLastCommentInfo (repo, pullRequests, callback) {
    let remaining = pullRequests.length;
    if (remaining === 0) {
        callback();
    }
    pullRequests.forEach(function (pullRequest) {
        const commentsUrl = pullRequest._links.comments && pullRequest._links.comments.href;
        const reviewCommentsUrl = pullRequest._links.review_comments && pullRequest._links.review_comments.href;

        if (commentsUrl && reviewCommentsUrl) {
            // If comments and review_comments URLs are present, use them (more accurate than scraping)
            getPullRequestComments(commentsUrl, function (comments) {
                getPullRequestComments(reviewCommentsUrl, comments, function (comments) {
                    // If we have any comments, grab the user name from the most recent one. If not, we'll display the
                    // owner of the PR (the initial PR comment is not included in the list of comments we get).
                    comments = comments.sort(function (a, b) {
                        // For simplicity, we want to end up with the newest comment first, so reverse sort on create date.
                        return new Date(b.created_at) - new Date(a.created_at);
                    });
                    if (comments.length > 0) {
                        pullRequest.lastUpdatedBy = comments[0] ? comments[0].user.login : pullRequest.user.login;
                    }
                    if (--remaining === 0) {
                        callback();
                    }
                });
            });
        } else {
            // Otherwise, resort to scraping.
            request.get({ url: 'https://github.com/apache/' + repo + '/pull/' + pullRequest.number, headers: { 'User-Agent': 'Cordova Coho' } }, function (err, res, payload) {
                if (err) {
                    if (!commentFailed) {
                        commentFailed = true;
                        console.warn('Pull request scrape request failed: ' + err);
                    }
                } else {
                    const m = /[\s\S]*timeline-comment-header[\s\S]*?"author".*?>(.*?)</.exec(payload);
                    (pullRequest.lastUpdatedBy = m && m[1]) || (''); // eslint-disable-line no-unused-expressions
                }
                if (--remaining === 0) {
                    callback();
                }
            });
        }
    });
}

function getPullRequestComments (url, existingComments, callback) {
    if (GITHUB_ACCOUNT) {
        url = url.replace('https://', 'https://' + GITHUB_ACCOUNT);
    }

    if (typeof existingComments === 'function') {
        callback = existingComments;
        existingComments = [];
    }

    request.get({
        url: url,
        headers: { 'User-Agent': 'Cordova Coho' }
    }, function (err, res, payload) {
        if (err) {
            if (!commentFailed) {
                commentFailed = true;
                console.warn('Getting pull request comments failed: ' + err);
            }
            callback(existingComments);
        }
        const comments = JSON.parse(payload);
        if (!comments.forEach) {
            // We don't have an array, so something failed
            if (!commentFailed) {
                commentFailed = true;
                console.warn('Getting pull request comments failed: did not return an array');
            }
            callback(existingComments);
        }
        callback(existingComments.concat(comments));
    });
}

function listGitHubPullRequests (repo, maxAge, hideUser, short, statsOnly, callback) {
    const url = GITHUB_API_URL + 'repos/' + GITHUB_ORGANIZATION + '/' + repo + '/pulls';

    request.get({ url: url, headers: { 'User-Agent': 'Cordova Coho' } }, function (err, res, pullRequests) {
        if (err) {
            apputil.fatal('Error getting pull requests from GitHub: ' + err);
        } else if (!pullRequests) {
            apputil.fatal('Error: GitHub returned no pull requests');
        } else if (res.headers['x-ratelimit-remaining'] && res.headers['x-ratelimit-remaining'] === 0) {
            const resetEpoch = new Date(res.headers['x-ratelimit-reset'] * 1000);
            const expiration = resetEpoch.getHours() + ':' + resetEpoch.getMinutes() + ':' + resetEpoch.getSeconds();
            apputil.fatal('Error: GitHub rate limit exceeded, wait till ' + expiration + ' before trying again.\n' +
                'See http://developer.github.com/v3/#rate-limiting for details.');
        }

        pullRequests = JSON.parse(pullRequests);
        const origCount = pullRequests.length;

        if (pullRequests.message === 'Bad credentials') {
            apputil.fatal('Error: GitHub Bad credentials. Check your CORDOVA_GIT_ACCOUNT environment variable which should be set with your Github API token: https://github.com/settings/tokens.',
                'CORDOVA_GIT_ACCOUNT used: ' + process.env.CORDOVA_GIT_ACCOUNT);
        }

        pullRequests = pullRequests.filter(function (p) {
            const updatedDate = new Date(p.updated_at);
            const daysAgo = Math.round((new Date() - updatedDate) / (60 * 60 * 24 * 1000));
            return daysAgo < maxAge;
        });
        const countAfterDateFilter = pullRequests.length;

        if (hideUser) {
            addLastCommentInfo(repo, pullRequests, next);
        } else {
            next();
        }

        function next () {
            const cbObj = {
                repo: repo,
                'fresh-count': 0,
                'old-count': 0,
                'stale-count': 0,
                'total-count': origCount,
                message: null
            };

            if (hideUser) {
                pullRequests = pullRequests.filter(function (p) {
                    return p.lastUpdatedBy !== hideUser;
                });
            }
            const count = pullRequests.length;
            cbObj['fresh-count'] = count;

            if (!statsOnly) {
                pullRequests.sort(function (a, b) { return (a.updated_at > b.updated_at) ? -1 : ((b.updated_at > a.updated_at) ? 1 : 0); });
            }

            let countMsg = count + ' Pull Requests';
            if (countAfterDateFilter !== origCount || count !== countAfterDateFilter) {
                countMsg += ' (plus ';
            }
            if (countAfterDateFilter !== origCount) {
                countMsg += (origCount - countAfterDateFilter) + ' old';
                cbObj['old-count'] = (origCount - countAfterDateFilter);
                if (count !== countAfterDateFilter) {
                    countMsg += ', ';
                }
            }
            if (count !== countAfterDateFilter) {
                countMsg += (countAfterDateFilter - count) + ' stale';
                cbObj['stale-count'] = (countAfterDateFilter - count);
            }
            if (countAfterDateFilter !== origCount || count !== countAfterDateFilter) {
                countMsg += ')';
            }

            if (!statsOnly) {
                console.log('\x1B[31m========= ' + repo + ': ' + countMsg + '. =========\x1B[39m');
            }

            if (!statsOnly) {
                pullRequests.forEach(function (pullRequest) {
                    const updatedDate = new Date(pullRequest.updated_at);
                    const daysAgo = Math.round((new Date() - updatedDate) / (60 * 60 * 24 * 1000));
                    console.log('\x1B[33m-----------------------------------------------------------------------------------------------\x1B[39m');
                    console.log('PR #' + pullRequest.number + ': ' + pullRequest.user.login + ': ' +
                        pullRequest.title + ' (\x1B[31m' + (pullRequest.lastUpdatedBy || '<no comments>') + ' ' + daysAgo + ' days ago\x1B[39m)');
                    console.log('\x1B[33m-----------------------------------------------------------------------------------------------\x1B[39m');
                    console.log('* ' + pullRequest.html_url);
                    // console.log('To merge: curl "' + pullRequest.patch_url + '" | git am');
                    if (!pullRequest.head.repo) {
                        console.log('NO REPO EXISTS!');
                    } else {
                        console.log('To merge: coho merge-pr --pr ' + pullRequest.number);
                    }
                    if (pullRequest.body) {
                        if (short && pullRequest.body.length > 100) {
                            console.log(pullRequest.body.substring(0, 100) + '...');
                        } else {
                            console.log(pullRequest.body);
                        }
                    }
                    console.log('');
                });
            }
            cbObj.message = countMsg;
            callback(cbObj);
        }
    });
}

function * listPullRequestsCommand () {
    let opt = flagutil.registerHelpFlag(optimist);
    opt = flagutil.registerRepoFlag(opt)
        .options('max-age', {
            desc: 'Don\'t show pulls older than this (in days)',
            type: 'number',
            default: 1000
        })
        .options('hide-user', {
            desc: 'Hide PRs where the last comment\'s is by this github user.',
            type: 'string'
        })
        .options('stats-only', {
            desc: 'List stats for PRs in the repos specified.',
            type: 'bool'
        })
        .options('sort-ascending', {
            desc: 'Used in conjunction with --stats-only. Sort the PRs ascending.',
            type: 'bool'
        })
        .options('json', {
            desc: 'Used in conjunction with --stats-only. Output the report in JSON format.',
            type: 'bool'
        })
        .options('short', {
            desc: 'Truncates PR body description',
            type: 'bool'
        });
    opt.usage('Reports what GitHub pull requests are open for the given repositories.\n' +
               '\n' +
               'Example usage: $0 list-pulls --hide-user="agrieve" | tee pulls.list | less -R\n' +
               'Example usage: $0 list-pulls --max-age=365 --repo=.\n' +
               'Example usage: $0 list-pulls --max-age=365 --repo=. --stats-only --json --sort-ascending --hide-user=cordova-qa | tail -n +2\n' +
               '\n' +
               'Please note that GitHub rate limiting applies. See http://developer.github.com/v3/#rate-limiting for details.\n' +
               'You can also set the CORDOVA_GIT_ACCOUNT environment variable with your Github API key: https://github.com/settings/tokens\n'
    );
    const argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    const repos = flagutil.computeReposFromFlag(argv.r);
    const report = {
        title: 'coho list-pulls report',
        // "command" : process.argv,
        timestamp: new Date().toJSON(),
        'max-age': argv['max-age'],
        repos: []
    };
    const simple_report = [];

    function next (reportObject) {
        if (reportObject && argv['stats-only']) {
            if (argv.json) {
                report.repos.push(reportObject);
            } else {
                simple_report.push(reportObject);
            }
        }

        if (repos.length) {
            const repo = repos.shift();
            listGitHubPullRequests(repo.repoName, argv['max-age'], argv['hide-user'], argv.short, argv['stats-only'], next);
        } else if (argv['stats-only']) { // done
            function compareFunc (a, b) { // eslint-disable-line no-inner-declarations
                if (a['fresh-count'] < b['fresh-count']) {
                    return argv['sort-ascending'] ? -1 : 1;
                }
                if (a['fresh-count'] > b['fresh-count']) {
                    return argv['sort-ascending'] ? 1 : -1;
                }
                return 0;
            }

            if (argv.json) {
                report.repos.sort(compareFunc);
                console.log(JSON.stringify(report, null, 4));
            } else {
                simple_report.sort(compareFunc);
                simple_report.forEach(function (report) {
                    console.log(report.repo + ' --> ' + report.message);
                });
            }
        }
    }

    let url = 'https://github.com/pulls?utf8=%E2%9C%93&q=is%3Aopen+is%3Apr';
    repos.forEach(function (repo) {
        url += '+repo%3Aapache%2F' + repo.repoName;
    });
    if (!(argv['stats-only'] && argv.json)) {
        console.log(url);
    }
    next();
}

module.exports = listPullRequestsCommand;
