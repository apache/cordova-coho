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

# Committer Workflow

## One-time Steps

Congratulations! You've gained the confidence of your fellow Cordova committers
and have been granted the ability to commit code directly, and to apply pull
requests from others. You should receive an email from our Apache mentor with
the details of how to setup your account.

## For example workflows of working on iOS or Android platforms & plugins,
see slides from ApacheCon 2015 talk on [Committer Tools](http://goo.gl/ciGnaR).

### Configure your git repos

It's convenient to have the origin of your git repos to point to Apache's repos
(as opposed to your clone of them on github). The easiest way to do this is to
delete them and re-clone them using coho:

    git clone https://git-wip-us.apache.org/repos/asf/cordova-coho.git
    cd cordova-coho
    npm install
    cd ..
    cordova-coho/coho repo-clone -r plugins -r mobile-spec -r ...

Test out your credentials with the following:

    git pull
    git push

If all goes well, git push should have asked you for your username and password, and an "Everything up-to-date" message should have been printed.

### Join the private mailing-list

This is a list that only committers can join.

Send an email to `private-subscribe@cordova.apache.org`.

Note that this is a moderated list, so your request to join must be manually accepted.

### Do Your Homework

Understanding how Apache works goes a long way:

* Read through: http://www.apache.org/dev/committers.html
* Read some board reports: https://www.apache.org/foundation/board/calendar.html
* Read through some of [Cordova's private mailing-list archives](https://mail-search.apache.org/pmc/private-arch/cordova-private/) (optional)

# Commit Workflow

### Step 1: Mail the Mailing-list (_optional_)
This is required if any of the following apply:
 * Your change will add/remove/change a public Cordova API
 * You suspect that your change has a chance of being controversial
 * You would like feedback before you begin

When possible, try to phrase things in the form of a proposal. If no one objects (within a workday or two), then consider yourself to have [lazy consensus](http://www.apache.org/foundation/glossary.html#LazyConsensus).

### Step 2: Ensure there is a JIRA issue
 * They are not necessary for *all* changes, (e.g. style nits, refactoring)
 * They should always be used for new features and bugs

### Step 3: Create a topic branch (_optional_)
 * Using a public topic branch is necessary only when you would like to collaborate on the feature.
 * For small changes, private topic branches are preferred.
 * Note: You should never rebase a public topic branch!

### Step 4: Make your changes
 * Thank you for making the world a better place.
 * Please beign your commit with the issue. Ex. `CB-XXXX **PLATFORM** Fixed broken scrolling`

### Step 5: Test your changes ###
 * You are responsible for testing the commits you push.
 * Tests vary by repo, but in general:
   * Plugins: Automated tests in mobile-spec and/or manual tests in mobile spec
   * Tools: run `npm test` from the project root
   * Platforms: Native unit tests (i.e., `cordova-android/test`, `cordova-ios/CordovaLibTests`)
   * Cordova JS: Run `grunt test`
 * If there is no existing test that exercises your code, consider adding one
 * If you are writing documentation (i.e., cordova-docs), be aware of the [style guidelines](https://github.com/apache/cordova-docs/blob/master/STYLESHEET.md|style guidelines).

### Step 6: Ask for a code review (_optional_)
 * Do this if you want a second pair of eyes to look at your code before it goes in.
 * Use either [reviewboard](code-reviews.md) or a GitHub pull request.

### Step 7: Push your change
 * When possible, rebase & squash your commits
   * Make sure you can figure out what your commit does by the first line of your commit discription.
 * If it fixes a regression, then also cherry-pick it into the appropriate release branch.

Here is an example workflow for committing a change when you've made it on a topic branch

    git pull
    git checkout topic_branch
    git rebase master -i
    git checkout master
    git merge --ff-only topic_branch
    git push
    git branch -d topic_branch

Here is an example workflow for committing a change when you've made it on master:

    git pull --rebase
    git rebase origin/master -i # Squash & reword commit messages
    git push

If you ever end up with a merge commit on master that you don't want:

    git rebase origin/master

If you need to add your change to a release branch:

    git checkout 2.9.x
    git cherry-pick -x COMMIT_HASH  # the -x flag adds "cherry-picked from <commit>" to the commit messages
    git push origin 2.9.x

The `git rebase -i` step is your chance to clean up the commit messages and to combine small commits when appropriate. For example:

    Commit A: CB-1234 Implemented RockOn feature
    Commit B: CB-1234 Added tests for RockOn
    Commit C: Fixed RockOn not working with empty strings
    Commit D: Renamed RockOn to JustRock
    Commit E: Refactor MainFeature to make use of JustRock.

 * In this case, it would be appropriate to combine commits A-D into a single commit, or at least commits A & C.
 * Fewer commits are better because:
   * Easier to comprehend the diff
   * Makes changelog more concise
   * Easier to roll-back commits should the need arise
 * __NEVER REBASE A COMMIT THAT HAS BEEN PUSHED__
 * For all commits:
   * Prefix with JIRA IDs: CB-1234
 * For commits to cordova-js or to plugins:
   * Prefix the message with the affected_platform so that it's clear who should take interest in the commit
   * e.g.: `CB-1234 android: Improved exec bridge by using strings instead of JSON`
   * e.g.: `CB-1234 all: Fixed plugin loading paths that start with /`

### Step 8: Update JIRA
 * An Apache bot should have already added a comment to the issue with your commit ID (based on the CB-1234 being in the commit message).
 * Click the "Resolve Issue" button
   * Add a comment saying what version the commit is in (e.g. Fixed in 0.1.3-dev).

### Step 9: Delete your topic branch

If you created a topic branch above, and you've merged your work to master,
delete your topic branch. This is because we don't want to accumulate a bunch
of topic branches which don't have anything that hasn't already been merged
to master.

If your topic branch doesn't get merged to master and sits around for a long
time to the point of becoming stale or abandoned, also please consider
deleting those topic branches. No sense in letting cruft accumulate.

# Which Branch to Commit To

### Platforms, mobile-spec, cordova-js, cordova-docs:
 * Commit all changes to branch: `master`
 * If it fixes a regression, cherry-pick into the release branch (see CuttingReleases)
   * e.g. To cherry pick the last commit from master: `git cherry-pick -x master`

### All other Repos:
 * Commit all changes to branch: `master`

# Processing Pull Requests #

See [processing-pull-requests.md](processing-pull-requests.md)

