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

## Release Notes for Cordova Coho ##

The command line tool to for Apache Cordova contributors to manage Apache Cordova repositories, and to help with releases and pull requests.

### 1.0.1 (Jun 20, 2018)

* Major documentation updates by [@janpio (Jan Piotrowski)](https://github.com/janpio)
* [CB-14145](https://issues.apache.org/jira/browse/CB-14145): package.json updates (npm audit fixes)
* [CB-14122](https://issues.apache.org/jira/browse/CB-14122): Updating knownIssues.json for devDeps
* [CB-13809](https://issues.apache.org/jira/browse/CB-13809) fix "increase version" stuff
* [CB-13828](https://issues.apache.org/jira/browse/CB-13828) Improve readability of index.md
* [CB-13624](https://issues.apache.org/jira/browse/CB-13624): revised contributor docs and fixed typos
* [CB-13624](https://issues.apache.org/jira/browse/CB-13624): note that commands are applied on `master` branch
* [CB-13635](https://issues.apache.org/jira/browse/CB-13635): Fix docs to remove unnecessary platform release steps
* [CB-13621](https://issues.apache.org/jira/browse/CB-13621): Fix the docs to remove update
* [CB-13065](https://issues.apache.org/jira/browse/CB-13065): Updated cordova contacts plugin reference as inactive
* [CB-13119](https://issues.apache.org/jira/browse/CB-13119): Added inactive flag for file transfer plugin
* [CB-13331](https://issues.apache.org/jira/browse/CB-13331): add in missing labels/tags to track issues more easily and clearly
* [CB-13068](https://issues.apache.org/jira/browse/CB-13068): Added inactive flag for device motion plugin
* [CB-13076](https://issues.apache.org/jira/browse/CB-13076): Added inactive flag for device orientation plugin
* [CB-12653](https://issues.apache.org/jira/browse/CB-12653): added `jasmine_co` and included jasmine tests for versionutil, apputil, flagutil, executil, and repoutil
* [CB-12762](https://issues.apache.org/jira/browse/CB-12762): point package.json repo items to github mirrors instead of apache repo site
* [CB-13511](https://issues.apache.org/jira/browse/CB-13511): removed reference to apache git repos
* [CB-13511](https://issues.apache.org/jira/browse/CB-13511): added new remote-update command to update remote to apache github repos
* [CB-13511](https://issues.apache.org/jira/browse/CB-13511): added github boolean to repos that have moved over to github
* [CB-13504](https://issues.apache.org/jira/browse/CB-13504): adding progress to knownIssues for cordova-fetch 1.2.1 release
* [CB-13278](https://issues.apache.org/jira/browse/CB-13278): remove doc-translation-process.md
* [CB-12895](https://issues.apache.org/jira/browse/CB-12895): added eslint
* [CB-13183](https://issues.apache.org/jira/browse/CB-13183) - updated log text
* [CB-13183](https://issues.apache.org/jira/browse/CB-13183) - Use .sha512 extension instead of .sha for releases
* [CB-13156](https://issues.apache.org/jira/browse/CB-13156) - Update coho for new Github cordova-ios, cordova-android, cordova-browser and cordova-windows
* [CB-12963](https://issues.apache.org/jira/browse/CB-12963): npm-link all dependencies
* [CB-12955](https://issues.apache.org/jira/browse/CB-12955): Update path for npm-link and tools-release-process.md
* [CB-11980](https://issues.apache.org/jira/browse/CB-11980): updated path to cordova-lib
* [CB-11980](https://issues.apache.org/jira/browse/CB-11980): added coho to nightlies
* [CB-12785](https://issues.apache.org/jira/browse/CB-12785): updated serve, common and fetch to use their new repos
* [CB-12847](https://issues.apache.org/jira/browse/CB-12847): added `bugs` entry to package.json.
* [CB-12793](https://issues.apache.org/jira/browse/CB-12793) Incremented package version to -dev

### 1.0.0 (May 11, 2017)

- Initial release, see `coho --help` for usage.
