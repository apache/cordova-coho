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

# Versioning and Release Strategy

## Versioning Strategies
 1. `SemVer` ([Semantic Version](http://www.semver.org))
   * Used by platforms, plugman, CLI, core plugins
   * Is important when describing dependencies in a sane way (e.g. within plugin.xml files)
   * Referenced sparingly by docs / blogs (e.g. only by release notes)
 2. `CadVer` (Cadence Version)
   * Used by CLI, mobile-spec, cordova-js
   * Also referred to as the "Cordova Version"
   * Referenced by our website, blogs & docs
   * Used by JIRA for the "Fix Version" field
   * Each `CadVer` maps to a set of repo `SemVer`s
     * E.g. 3.0.0 uses `cordova-blackberry@3.0.0, cordova-ios@3.0.0, cordova-android@3.0.0`
     * E.g. 3.1.0 uses `cordova-blackberry@3.1.0, cordova-ios@3.0.1, cordova-android@4.0.0`
     * E.g. 3.2.0 uses `cordova-blackberry@3.1.1, cordova-ios@3.1.0, cordova-android@4.0.1`
     * E.g. 3.2.1 uses `cordova-blackberry@3.1.2, cordova-ios@3.1.0, cordova-android@4.0.1`

CLI exists in both lists because its version has the format: `CadVer-SemVer`
 * E.g.: `3.0.0-0.5.1`


## Release Strategies
 1. __On-Demand Releases__
   * Any repository can do an on-demand release at any time.
   * These happen only when the team decides that a release cannot wait for the next regular release to happen.
   * These releases contain critical bug fixes that can't wait for the next scheduled release.
 2. __Weekly Releases__
   * These occur at most once a week (if there are no commits worth releasing, then skip the release).
     * Rationale: Reduces the number of releases to at most one per week so that users are not annoyed by having to update too frequently.
     * Rationale: Reduces the number of blog posts and release notes to write.
   * These releases apply to: `CLI`, `Plugman`, and `Core Plugins`.
   * These releases contain non-critical bug fixes as well as new features.
   * Releases generally happen on Thursdays, but can be done on any day so long as it's been a week since the previous release.
 3. __Cadence Releases__
   * These follow the 10 releases per year, as enumerated on RoadmapProjects.
   * The `CadVer` is increased (either MAJOR or MINOR) on each release.
   * The `SemVer` is increased only if there are changes since the previous release.

Related docs:
* [storing-repo-versions-design.md](storing-repo-versions-design.md)
* [cadence-release-process.md](cadence-release-process.md)
* [committer-workflow.md](committer-workflow.md)

