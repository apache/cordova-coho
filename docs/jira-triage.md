<!--
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#  KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
-->

#JIRA Issue Triage Process

##Goal
Every issue needs to be triaged. A triaged issue is actionable and there is an eventual desire to resolve it and has all the fields set accurately. In particular, low quality issues are eliminated from the system. Also, critical issues need to be fixed asap and this process should highlight those.

##Process
Go through each [unresolved bug that is not labeled 'triaged' ordered by created Date](https://issues.apache.org/jira/issues/?jql=status%20not%20in%20(Resolved%2C%20Closed)%20AND%20(labels%20is%20EMPTY%20OR%20labels%20!%3D%20triaged)%20AND%20%20project%20%3D%20CB%20ORDER%20BY%20createdDate%20DESC).

- Ensure the bug details has sufficient details for a repro. If not, message the reporter with questions. If the reporter does not respond in 4 business days. Resolve the bug as `Invalid`. They are welcome to re-activate the bug with details at a later date.
- If you can reproduce the issue. Add a label `reproduced`. If not, Resolve the bug as `Cannot reproduce`.
- If you are not an expert in the area or do not have the hardware for triaging, reference the platform and/or component owner in helping triage the bug.
- Edit the following fields:
	- **Component**: Should be ideally a single component. *For plugin issues do not add platform names here.*
	- **Work item type**: Ensure it has the correct classification - feature request vs task vs bug.
	- **Priority**: 
		- `Blocker`: This will block the current release of the component. The failure is catastrophic and easy to hit. 'Hello world' and [mobilespec](https://github.com/apache/cordova-mobile-spec) does not build or crashes.
		- `Critical`: This will cause the main function of the component to fail and needs to be fixed asap but will not block the release. 
		- `Major`: Important one to fix.
		- `Minor`, `Trivial`: Nice to haves.
	- **Label**: Use the following:
		- `regression` - A change introduced in previous release or commit that surfaced the issue. Ideally, add a link to the commit that caused the issue.
		- `ios`, `android`, `windows` etc. platforms - If it is a plugin issue and affects one of these platforms
		- `easyfix` - For issues that are easy for a new contributor to fix. We will eventually publish an easyfix query for new contributors to participate.
		- `triaged` - Indicates bug that has been triaged and does not need to be triaged again.
		- `reproduced` - Bug that has a reproduction.
	- **Environment**: Represents the machine setup required to reproduce the problem. Great place for mobile OS, host OS versions etc.
	- **Affected version**: Specify the version of the component that the issue appears in.
	- **Assigned To**: If you plan to work on a particular issue, assign it to yourself. If the issue has not been worked on by the assignee i.e. status is not `in progress` or it's clear that the assignee is not looking at this actively. The issue can be taken up by anyone.

At the end of triage session, send an e-mail to the dev list discussing bugs that need urgent attention. Good bugs in this area are recent regressions or other issues having a wide impact. These would require a patch release to fix them.

##Asking for help
Sometimes while there is a bug or a feature request that seems valid, but it might not be high priority for one of the committers to fix. Following up with the issue reporter quickly and coaching him through making a contribution with a pull request is a good idea.

##Tips when asking for more info from reporter
- If the cordova version is not provided, ask reporter to use “cordova -v” to verify which version of cordova he/she is using.
- If the platform version is not provided, ask the reporter to use “cordova platform ls” to verify which platform version he/she is using.
- If the issue is unclear, ask the reporter to provide more details via screen shot, sample code, or a command line log.
 
##Dealing with feature requests
New features to plugins should ideally be cross platform (at least across more than one major platform - Android, iOS, Windows). The design should account for ease of detection or meaningful degradation in the absence of the feature on a partcular platform. For feature requests that are overly specific to a particular usecase - we should resolve them with resolution reason `Later` or `Won't Fix`. There is little value in carrying the debt of these issues.

##Open issues
- Assignments: Who does JIRA triage? Do we need a weekly rotation duty? Should we publish a schedule? Should we distribute by component?
