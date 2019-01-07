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

# Storing Versions
This section describes how we _store_ version numbers on our various repositories.

## Cordova Platform Repositories
There are two aspects of this:
 1. Storing the version for the repository
 2. Storing the version of the platform of a created project (as created by the `bin/create` script)

For #1:
 * We will continue to use a `VERSION` file at the root of the repository.

For #2:
 * There is already a way to report the version - through the `cordova/version` script of a created project.
 * The logic of this script used to be different across platforms
 * The new logic here is to have it echo a hard-coded string, which is the contents of the `VERSION` file at the time of creation.

## Cordova JS
There are two aspects of this:
 1. Storing the version for the repository
 2. Storing the version for within generated cordova.js files.

For #1:
 * We will continue to use a `VERSION` file at the root of the repository.

For #2:
 1. Use build-time logic to stamp cordova.js files with a version through a variable at the top of the file.
 2. When built in the context of a git repo, and not at a tagged commit, append the git hash.
 3. When not in a git repo or at a tagged commit, don't try and append a hash.

## Cordova Plugins
Plugins store their version within their plugin.xml file. No `VERSION` files exist.

## Plugman & CLI
These tools are built as npm modules, and so use package.json. No `VERSION` files exist.


# Choosing Version Numbers Based on Dev vs Release
This section describes how we __choose version numbers for each branch within our various repositories.

## Cordova Platform Repositories
The version number should correspond closely to the git branch. When a release branch is made, both the branch and the master branch should be updated. The master branch should **always** have a version number ending in "-dev", which indicates the version currently being developed. A fresh release branch should change the version to an "-rc1" version, and then change to the unqualified version number when it is released.

(This constant version number can be updated manually, but *should* eventually be updated via coho as release branches are made.)

This should give a rough idea how the version number should advance:

             3.3.0-dev
     3.2.0-dev|
      |       |
    --A---B---C---D (master)
           \
            \--E---F---G---H (3.2.x)
               |       |   |
              3.2.0-rc1|  3.2.1-rc1
                      3.2.0

 * A: This is on the master branch, after 3.1.x has been branched, as 3.2 is being developed.
 * B: This is the branch point for 3.2.x
 * C: The first commit after 3.2.x is branched should identify the master branch as 3.3 is being developed on master now.
 * E: The first commit on the 3.2.x branch should identify the branch as 3.2.0-rc1
 * G: At some point, 3.2.0 is released, and should be identified as such
 * H: After 3.2.0 is released, any further development can be called 3.2.1-rc1

Current support:

    ||'''Platform'''||'''Support'''||
    ||Android       || {*}         ||
    ||iOS           || {o}         ||
    ||OSX           || {o}         ||
    ||Win           || {o}         ||
    ||www           || {o}         ||

## Cordova JS
cordova-js follows the same scheme as platforms.


## Cordova Plugins
Current state is that we have master & dev branches. This is because plugman pulls from master by default, so it must remain stable.

 1. Versions should stay be suffixed with "-dev" on the dev branch.
 2. This means a releases involves:
    1. Update plugin.xml's version to "3.1.0" on dev branch
    2. Merge dev -> master
    3. Update plugin.xml's version to "3.2.0-dev" on dev branch

## Plugman & CLI
cordova-plugman and cordova-cli follow the same scheme as platforms.
