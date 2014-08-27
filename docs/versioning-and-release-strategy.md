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

CLI exists in both lists because its version has the format: `CadVer-SemVer`
 * E.g.: `3.0.0-0.5.1`

## Release Strategies
 1. __On-Demand Releases__
   * Any repository can do an on-demand release at any time.
   * These releases contain critical bug fixes that can't wait for the next scheduled release.
 2. __Weekly Releases__
   * These occur at most once a week (if there are no commits worth releasing, then skip the release).
     * Rationale: Reduces the number of releases to at most one per week so that users are not annoyed by having to update too frequently.
     * Rationale: Reduces the number of blog posts and release notes to write.
   * These releases apply to: `CLI`, `Plugman`, and `Core Plugins`.
   * These releases contain non-critical bug fixes as well as new features.
   * Releases generally happen on Thursdays, but can be done on any day so long as it's been a week since the previous release.
 3. __Platform Releases__
   * Release whenever platform mainters decide they want to release
   * Tools also get updated with a platform release

Related docs:
* [storing-repo-versions-design.md](storing-repo-versions-design.md)
* [cadence-release-process.md](cadence-release-process.md)
* [committer-workflow.md](committer-workflow.md)

