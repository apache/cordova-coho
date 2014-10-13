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

# Versioning Strategy

## Version Format

`SemVer` ([Semantic Version](http://www.semver.org)) will be used as the
version format for all components, including platforms, plugman, CLI, core
plugins. Doing so is important when describing dependencies in a sane way
(e.g. within plugin.xml files). Although the CLI previously used a 
`CadVer-SemVer` format, it now uses a simple SemVer format. The `CadVer` format
is no longer used in any Cordova components. The plugins no longer have an `r`
prefix.

The semantics of `SemVer` should be followed, bumping the appropriate digit
based on the impact of the new content.

## Branching and Tagging

All components also follow the same branching and tagging strategy, including
plugins and tools. A `major.minor.X` release branch (i.e., "3.7.x") should be
created, and any fixes should be appended to that release branch. New content
should be on the master branch, and a new release branch created at release
time. When a release is performed, a release tag is added to the appropriate
branch (i.e., "3.8.0" tag is put on the "3.8.x" branch).

## Version Behavior

Plugin versions will all be separate and independent. So there may be a "1.2.0"
of the Device plugin, and a "3.4.5" of the Camera plugin at the same time.
The bumping of the version numbers of each plugin should be appropriate to the
new content added to that plugin. The `cordova plugin add` command will add
the most recent version of that plugin by default, though alternately the user
may manually specify an explicit version of that plugin to be installed (i.e.,
`cordova plugin add org.apache.cordova.device@1.2.0`). Plugin docs should be
stored in each plugin repo, so that the docs are versioned with their source
code

Platform versions will all be separate and independent. So there may be a
"3.7.0" of the iOS platform and a "4.0.0" of the Android platform at the same
time. The bumping of version numbers of each platform should be appropriate
to the new content being added to that platform. The `cordova platform add`
command will add a platform version specific to the CLI by default, though
alternatively the user may manually specify an explicit version of that
platform to be installed (i.e., `cordova platform add android@4.0.1`).
The CLI will hold the list of default versions for each platform
(i.e., platform version pinning). Platform docs should be stored in each
platform repo, so that the docs are versioned with their source code.

Platforms will have an &lt;engine&gt; tag or equivalent, to specify when a
platform needs a newer version of the CLI.

`cordova-js` versions should continue to be single-sourced, meaning that when
`cordova-js` is used by multiple components such as `cordova-lib` or 
`cordova-android`, the `cordova-js` version number should not be manually
modified upon insertion to the consuming component, but instead should retain
its build-time value. This means that there may be different versions of 
`cordova-js` in use across each Cordova component.

`cordova-lib`, `plugman`, and CLI versions will all be separate. So there
may be a "0.25.3" version of `plugman` and a "1.3.2" version of `cordova-lib`
and a "3.8.0" version of the CLI at the same time. The bumping of version
numbers of each of the tool components should be appropriate to the new
content being added to that individual component. The exception to this
is that when a new platform is released, and the platform pin in the CLI
is correspondingly updated, the CLI receives a bump to its third digit, no
matter the size of the version bump to those platform(s).

When a user updates the version of the CLI they have installed, this CLI
update has no effect on the platform and plugin versions that are already
installed in their project, but they may receive a warning or notice if
the installed platform versions are older than the versions pinned by
the CLI. However, if they subsequently do a "cordova platform upgrade"
they will get the pinned version based on the CLI.

The CLI version number will be the "name" of the Cordova version. Thus
tools and platform updates will cause a bump of the "Cordova version",
but plugins will not.

Where Cordova components have dependencies upon other Cordova components
(i.e., CLI depends on `cordova-lib`) or upon third-party components (i.e.,
CLI depends on `nopt`), the `package.json` should fully pin the version of
the dependent component (i.e., "nopt: "2.3.4"). This is in lieu of 
npm-shrinkwrap since npm-shrinkwrap is not reasonably mature.

For users that want to install a "fixed recipie" of specific versions
of these components, there are two ways to do that:

- `cordova --save` and `cordova --restore`
- using specific version numbers:

    npm install cordova@3.8.0
    cordova platform add android@4.0.1
    cordova plugin add org.apache.cordova.device@1.2.3

# Release Strategies
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
   * Release whenever platform maintainers decide they want to release
   * Tools also get updated with a platform release

Related docs:
* [storing-repo-versions-design.md](storing-repo-versions-design.md)
* [cadence-release-process.md](cadence-release-process.md)
* [committer-workflow.md](committer-workflow.md)

