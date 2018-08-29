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

`SemVer` ([Semantic Versioning](http://www.semver.org)) will be used as the
version format for all components, including platforms, plugman, CLI, and core
plugins. The semantics of `SemVer` should be followed, bumping the appropriate digit
based on the impact of the new content: `MAJOR.MINOR.PATCH`

## Branching and Tagging

All components also follow the same branching and tagging strategy, including
plugins and tools. A `major.minor.X` release branch (i.e., "3.7.x") should be
created, and any fixes should be appended to that release branch. New content
should be on the master branch, and a new release branch created at release
time. When a release is performed, a release tag is added to the appropriate
branch (i.e., "3.8.0" tag is put on the "3.8.x" branch).

## Version Behavior

### Plugin Version Behavior

Plugin versions will all be separate and independent. So there may be a "1.2.0"
of the Device plugin, and a "3.4.5" of the Camera plugin at the same time.
The bumping of the version numbers of each plugin should be appropriate to the
new content added to that plugin. 

The `cordova plugin add` command will add
the most recent compatible version of that plugin by default. Alternately the user
may manually specify an explicit version of that plugin to be installed (i.e.,
`cordova plugin add org.apache.cordova.device@1.2.0`). 

Plugin docs should be
stored in each plugin repo, so that the docs are versioned with their source
code.

### Platform Version Behavior

Platform versions will all be separate and independent. So there may be a
"3.7.0" of the iOS platform and a "4.0.0" of the Android platform at the same
time. The bumping of version numbers of each platform should be appropriate
to the new content being added to that platform.

The `cordova platform add`
command will add a platform version specific to the CLI by default.
Alternatively, the user may manually specify an explicit version of that
platform to be installed (i.e., `cordova platform add android@4.0.1`).
The CLI will hold the list of default versions for each platform
(i.e., platform version pinning).

Platform docs should be stored in each
platform repo, so that the docs are versioned with their source code.

Platforms will have an &lt;engine&gt; tag or equivalent, to specify when a
platform requires a newer version of the CLI.

### `cordova-js` Version Behavior

`cordova-js` versions should continue to be single-sourced, meaning that when
`cordova-js` is used by multiple components such as `cordova-lib` or
`cordova-android`, the `cordova-js` version number should not be manually
modified upon insertion to the consuming component, but instead should retain
its build-time value. This means that there may be different versions of
`cordova-js` in use across Cordova components.

### Tools Version Behavior

`cordova-lib`, `plugman`, and CLI versions will all be separate. So there
may be a "0.25.3" version of `plugman` and a "1.3.2" version of `cordova-lib`
and a "3.8.0" version of the CLI at the same time. The bumping of version
numbers of each of the tool components should be appropriate to the new
content being added to that individual component.

One exception to this
is that when a new platform is released, and if the only update in the CLI
is the platform pin, then the CLI receives a bump to its third digit, no
matter the size of the version bump to those platform(s). If the CLI requires
a change beyond updating the pin to handle the new platform, or if the CLI
has other changes, then the `SemVer` semantics still apply for the CLI -
the second or even first digit of the CLI version may get bumped.

Furthermore,
if `cordova-lib` or `plugman` have a version bump due to new content (beyond
updating the pin), then at least the same digit of the CLI version should get
bumped, since the CLI is primarily composed of `cordova-lib` and `plugman`.

Tools docs should be stored in each
tool repo, so that the docs are versioned with their source code.

The CLI version number will be the "name" of the Cordova version. Thus
tools and platform updates will cause a bump of the "Cordova version",
but plugins will not.

### Pinning

Where Cordova components have dependencies upon other Cordova components
(i.e., CLI depends on `cordova-lib`) or upon third-party components (i.e.,
CLI depends on `nopt`), the `package.json` should fully pin the version of
the dependent component (i.e., "nopt": "2.3.4") (dependency pinning).
This is in lieu of npm-shrinkwrap since npm-shrinkwrap is not reasonably mature.

### Installing specific versions

For users that want to install a "fixed recipe" of specific versions
of all the Cordova components, there is one way to do that:

- using specific version numbers:

        npm install cordova@3.8.0
        cordova platform add android@4.0.1
        cordova plugin add cordova-plugin-device@1.2.3

Do note that third-party dependencies which themselves have dependencies on
other third-party content (i.e., `nopt` depends on `abbrev`), those relationships
may not be fully pinned since we don't have control of those third-party
contents. For example, `nopt` 2.2.1 may specify a non-pinned dependency on version 1.x.x of
`abbrev`. So a user may get different versions of `abbrev` at different times
even though they consistently executed `npm install cordova@3.8.0`. As
npm-shrinkwrap matures, we hope that it will take care of dependency pinning
across the whole tree. Until then, only part of the tree is properly pinned.

## Upgrade Behavior

When a user updates the version of the CLI they have installed, this CLI
update has no effect on the platform and plugin versions that are already
installed in their project, but they may receive a warning or notice if
the installed platform versions are older than the versions pinned by
the CLI.

Release notes should be easy for users to find and understand. This is important
because of the non-trivial number of components.


## Release Strategies

1. __On-Demand Releases__
   - Any repository can do an on-demand release at any time.
   - These releases contain critical bug fixes that can't wait for the next scheduled release.
2. __Weekly Releases__
   - These occur at most once a week (if there are no commits worth releasing, then skip the release).
      - Rationale: Reduces the number of releases to at most one per week so that users are not annoyed by having to update too frequently.
      - Rationale: Reduces the number of blog posts and release notes to write.
      These releases apply to: `CLI`, `Plugman`, and `Core Plugins`.
   - These releases contain non-critical bug fixes as well as new features.
   - Releases generally happen on Thursdays, but can be done on any day so long as it's been a week since the previous release.
3. __Platform Releases__
   - Release whenever platform maintainers decide they want to release.
   - Tools also get updated with a platform release.

When a component is released, it is tested against the most recent released
version of its peer components. Note that this is the only combination that is
tested by the community. For example, when a new Android platform is
released, it was tested against the latest released tools and plugins. Another
example, when a plugin is released, it is tested against the latest released
platforms and tools.

Users are encouraged to use versions that are "date clustered". The reason for
this is the testing described in the previous paragraph. Attempting to use a
component that is an outlier in age compared to the other components may yield
unpredictable behavior, since that combination may not have been tested by
the community.

In general, there are no support streams for Cordova components. If there is
a defect to be fixed or a new feature to be added, it will be done in the master
(trunk) stream only, and made available in the next release. Fixes are not
backported to already-released branches. There may be exceptions to this, such
as an important security vulnerability, but these exceptions are rare.

For the reason in the previous paragraph, users are encouraged to use recent
versions of Cordova components, and to stay reasonably current with new versions
of Cordova components. This becomes important not just for bug fixes,
but also for any enablement of new versions of device operating systems (i.e.,
iOS 8, Android L, etc). This enablement is not backported to older versions.

Related docs:
* [storing-repo-versions-design.md](storing-repo-versions-design.md)
* [cadence-release-process.md](cadence-release-process.md)
* [committer-workflow.md](committer-workflow.md)

