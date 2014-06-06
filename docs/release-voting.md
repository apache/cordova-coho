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

# Release Voting Guidelines

Reference: https://www.apache.org/dev/release-publishing.html

Apache releases require at least 3 +1 votes, and there must be more +1s than -1s.

**Note**: There is no benefit in having more than 3 +1 votes. Don't waste your time if a vote already looks in good shape.

How to start / close a vote thread is described in the release process docs.
This page focuses on what it means to +1 a vote thread.

When we (or at least, members of the PMC), vote on a release, we
are expressing confidence that:

1. Our sources are properly licensed*.
1. We have only compatibly licensed dependencies (and appropriate NOTICE lines)*.
1. No IP was added without the consent of its owner**.
1. Archives are properly signed & hashed.
1. Repo tags match sha1 stated in vote email.
1. We believe the quality of the release is better than the previous one.

_* These items are generally checked by the Release Manager.
The Release Manager should state that they've checked them when they +1 the vote._

_** It is the responsibility of committers to ensure that no
invalid IP enters the codebase. It's not something that we need to re-check
at each release. For more info, see [this discussion](http://markmail.org/thread/7gqwzrdie46f4qtx)_

When you +1 a vote. You should say what work you did in order to gain confidence in the release.

For example, the Release Manager would say:

    +1

    * Ran coho audit-license-headers over the relevant repos
    * Used `license-checker` to ensure all dependencies have Apache-compatible licenses
    * Ensured continuous build was green when repos were tagged

For example, someone else might say:

    +1

    * Confirmed sigs & hashes with `coho verify-archive`
    * Verified sha1s match tags with `coho verify-tags`
    * Re-created archives to ensure contents match release candidate

About the quality of the release (in the list above):
  - We strive to maintain release-worthy quality at all times.
  - cordova-medic runs automated tests for each commit.

Given these:
  - Manual testing can be done with release candidates, but is not strictly necessary.
  - Bugs don't block releases, but regressions generally do.

