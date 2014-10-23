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
var repoutil = require('./repoutil');
var print = apputil.print;

var JIRA_API_URL = "https://issues.apache.org/jira/rest/api/latest/";
var JIRA_PROJECT_KEY = "CB";

function sendCreateIssueRequest(issue, username, password, pretend, callback) {
    var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
    requestToSend = {
        'uri':JIRA_API_URL + 'issue',
        'headers':{
            'Authorization':auth
        },
        'json':issue
    };
    print('creating jira issue: ' + issue.fields.summary);
    if (!pretend) {
        request.post(requestToSend, callback);
    } else {
        print('sending request:');
        console.log(JSON.stringify(requestToSend, null, 2));
        callback(null, { 'statuscode':0 }, { 'key':'1234567' });
    }
}

function sendCreateSubtaskRequests(request_queue, username, password, pretend) {
    if (request_queue.length == 0) {
        return;
    }
    sendCreateIssueRequest(request_queue.shift(), username, password, pretend, function(err, res, body) {
        if (err) {
            print('there was an error creating subtask.');
        } else if (res.statuscode >= 400) {
            print('got http status ' + res.statuscode + ' during subtask creation.');
            print(body);
        } else {
            sendCreateSubtaskRequests(request_queue, username, password, pretend);
        }
    });
}

function makeSubtask(parent_key, summary, description, component_ids, version_id) {
    var components = [];
    component_ids.forEach(function(component_id) {
        components.push({'id':component_id});
    });
    return {
        'fields':{
            'project':{
                'key':JIRA_PROJECT_KEY
            },
            'parent':{
                'key':parent_key
            },
            'summary':summary,
            'description':description,
            'issuetype':{
                'name':'Sub-task'
            },
            'components':components,
            'fixVersions': [{
                'id':version_id
            }]
        },
    };
}

function createReleaseBug(version, root_version, prev_version, version_id, username, password, component_map, pretend) {
    var subjectPrefix = '[Release + ' + version + '] ';
    var workflow_link = 'Workflow here:\nhttp://wiki.apache.org/cordova/CuttingReleases';
    var parent_issue = {
        'fields':{
            'project':{
                'key':JIRA_PROJECT_KEY
            },
            'summary':subjectPrefix + 'Parent Issue',
            'description':'Parent bug for the ' + version + ' Cordova Release.\n\n' + workflow_link +
                          '\n\nRelease Master: ?\n\nComponent Leads: Refer to assignee of "Test & Tag" sub-tasks.\n',
            'issuetype':{
                'name':'Task'
            },
            'fixVersions': [{
                'id':version_id
            }],
            'components': []
        }
    };
    function componentsForRepos(repos) {
        return repos.map(function(repo) {
            if (!component_map[repo.jiraComponentName]) {
                apputil.fatal('Unable to find component ' + repo.jiraComponentName + ' in JIRA.');
            }
            return component_map[repo.jiraComponentName];
        });
    }
    var all_components = componentsForRepos(repoutil.repoGroups['cadence']);
    all_components.forEach(function(component_id) {
        parent_issue.fields.components.push({'id':component_id});
    });

    sendCreateIssueRequest(parent_issue, username, password, pretend, function(err, res, body) {
        if (err) {
            apputil.fatal('Error creating parent issue: ' + err);
        }
        var parent_key = body.key;
        if (!parent_key) {
            apputil.fatal('No ID retrieved for created parent issue. Aborting.');
        }
        var request_queue = [];
        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Branch & Test & Tag RC1 for: cordova-js, cordova-mobile-spec and cordova-app-hello-world',
                                       'Refer to ' + workflow_link, componentsForRepos([repoutil.getRepoById('js'), repoutil.getRepoById('mobile-spec'), repoutil.getRepoById('app-hello-world')]), version_id));
        repoutil.repoGroups['active-platform'].forEach(function(repo) {
            request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Branch & Test & Tag RC1 for ' + repo.title, 'Refer to ' + workflow_link,
                                           componentsForRepos([repo]), version_id));
        });
        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Branch & Tag RC1 of cordova-cli',
                                       'Refer to ' + workflow_link, componentsForRepos([repoutil.getRepoById('cli')]), version_id));

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Upload docs without switching default',
                                       'Refer to ' + workflow_link, componentsForRepos([]), version_id));

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Create blog post for RC1 & Announce',
                                       'Refer to ' + workflow_link, componentsForRepos([]), version_id));

        repoutil.repoGroups['active-platform'].forEach(function(repo) {
            request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Test & Tag ' + version + ' for ' + repo.title, 'Refer to ' + workflow_link,
                                           componentsForRepos([repo]), version_id));
        });

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Test & Tag ' + version + ' of cordova-cli',
                                       'Refer to ' + workflow_link, componentsForRepos([repoutil.getRepoById('cli')]), version_id));

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Create blog post for final release & get reviewed',
                                       'Refer to ' + workflow_link, componentsForRepos([]), version_id));

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Upload signed release .zip to Apache Dist',
                                       'Refer to ' + workflow_link, componentsForRepos([]), version_id));

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Change default docs to new version',
                                       'Refer to ' + workflow_link, componentsForRepos([]), version_id));

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Announce Release',
                                       'Refer to ' + workflow_link, all_components, version_id));
        sendCreateSubtaskRequests(request_queue, username, password, pretend);
    });
}

module.exports = function*() {
    var opt = flagutil.registerHelpFlag(optimist);
    opt = opt.options('version', {
        desc: 'The version to use for the branch. Must match the pattern #.#.#',
        demand: true
    }).options('username', {
        desc: 'Username to use when creating issues in JIRA',
        demand: true
    }).options('password', {
        desc: 'Password to use when creating issues in JIRA',
        demand: true
    }).options('pretend', {
        desc: 'Instead of creating issues in JIRA, print the issue creation requests that would have been sent instead'
    });
    opt.usage('Creates an issue in JIRA for releasing a new version of Cordova, including creating all subtasks.\n' +
              '\n' +
              'Usage: $0 create-release-bug [--pretend] --version=3.0.0 --username=Alice --password=Passw0rd');
    var argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var version = flagutil.validateVersionString(argv.version);
    if (version.indexOf('-') != -1) {
        apputil.fatal('Don\'t append "-rc" for release bugs.');
    }

    request.get(JIRA_API_URL + 'project/' + JIRA_PROJECT_KEY + '/components', function(err, res, components) {
        if (err) {
            apputil.fatal('Error getting components from JIRA: ' + err);
        } else if (!components) {
            apputil.fatal('Error: JIRA returned no components');
        }
        components = JSON.parse(components);
        var component_map = {};
        components.forEach(function(component) {
            component_map[component.name] = component.id;
        });

        request.get(JIRA_API_URL + 'project/' + JIRA_PROJECT_KEY + '/versions', function(err, res, versions) {
            if (err) {
                apputil.fatal('Error getting versions from JIRA: ' + err);
            } else if (!versions) {
                apputil.fatal('Error: JIRA returned no versions');
            }
            versions = JSON.parse(versions);
            var root_version = version;
            var version_id = null;
            var prev_version = null;
            if (version.indexOf('r') > -1) {
                root_version = version.substr(0, version.indexOf('r'));
            }
            for (var i = 0; i < versions.length; i++) {
                if (versions[i].name == root_version) {
                    version_id = versions[i].id;
                    prev_version = versions[i - 1].name;
                    break;
                }
            }
            if (!version_id) {
                apputil.fatal('Cannot find version ID number in JIRA related to "root" version string: ' + version);
            }
            createReleaseBug(version, root_version, prev_version, version_id, argv.username, argv.password, component_map,
                             argv.pretend);
        });
    });
}

