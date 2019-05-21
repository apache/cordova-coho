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

# Release Process for Cordova Platforms

This page describes the technical steps for doing a `Platforms Release`.

## Table of contents

It describes the following steps:

- [General instructions](#general-instructions)
  * [Read first](#read-first)
  * [Repository setup](#repository-setup)
- [Before you start](#before-you-start)
  * [Read through Apache release policy](#read-through-apache-release-policy)
  * [Request buy-in](#request-buy-in)
- [Before Release](#before-release)
  * [npm audit check](#npm-audit-check)
  * [Check dependencies](#check-dependencies)
  * [Resolve any outdated dependencies](#resolve-any-outdated-dependencies)
  * [License Check](#license-check)
  * [Create JIRA issue](#create-jira-issue)
- [Prepare Release](#prepare-release)
  * [Optional: Set release version in `package.json`](#optional-set-release-version-in-packagejson)
    - [Remove the `-dev` suffix from version](#remove-the--dev-suffix-from-version)
    - [Optional: Increase version](#optional-increase-version)
  * [Create Release Notes](#create-release-notes)
  * [Commit Release Notes and optional version changes together](#commit-release-notes-and-optional-version-changes-together)
  * [Special Case 1: Release notes in release branch for patch release](#special-case-1-release-notes-in-release-branch-for-patch-release)
  * [Special Case 2: releasing new commits from an already-existing release branch](#special-case-2-releasing-new-commits-from-an-already-existing-release-branch)
  * [Create Release Branch](#create-release-branch)
- [Testing](#testing)
  * [Prerequisite: npm test](#prerequisite-npm-test)
  * [1) Plugin tests with `cordova-mobile-spec` project](#1-plugin-tests-with-cordova-mobile-spec-project)
  * [2) hello world app with `cordova` CLI](#2-hello-world-app-with-cordova-cli)
  * [3) `/bin` scripts](#3-bin-scripts)
  * [4) `cordova-lib` tests](#4-cordova-lib-tests)
  * [5) Clean up](#5-clean-up)
  * [When a regression is found](#when-a-regression-is-found)
  * [To submit a fix](#to-submit-a-fix)
- [Push Changes](#push-changes)
  * [Push commits](#push-commits)
  * [Tag and push tag](#tag-and-push-tag)
- [Publish Release Candidate to `dist/dev`](#publish-release-candidate-to-distdev)
- [Documentation and Communication](#documentation-and-communication)
  * [Documentation To Update](#documentation-to-update)
  * [Prepare Blog Post](#prepare-blog-post)
- [Voting and Release](#voting-and-release)
  * [Start VOTE Thread](#start-vote-thread)
  * [Email the result of the vote](#email-the-result-of-the-vote)
  * [If the Vote does *not* Pass](#if-the-vote-does-not-pass)
  * [Otherwise: Publish real release to `dist/` & npm](#otherwise-publish-real-release-to-dist--npm)
  * [(Android only) Uploading to Bintray](#android-only-uploading-to-bintray)
  * [Add permanent Apache release tag to repository](#add-permanent-apache-release-tag-to-repository)
- [Follow up steps](#follow-up-steps)
  * [Tell Apache about Release](#tell-apache-about-release)
  * [Email a release announcement to the mailing list](#email-a-release-announcement-to-the-mailing-list)
  * [Announce It!](#announce-it)
  * [Close JIRA issue](#close-jira-issue)
  * [Finally](#finally)
- [Other stuff that should be reviewed and moved up to the appropriate places](#other-stuff-that-should-be-reviewed-and-moved-up-to-the-appropriate-places)
  * [Update the Docs](#update-the-docs)
  * [Moving Tags](#moving-tags)
    
<!-- created with https://ecotrust-canada.github.io/markdown-toc/ and some manual fixing -->

(Yes this list is long and scary, but represents the content below)

## General instructions

### Read first

- See: [versioning-and-release-strategy.md](versioning-and-release-strategy.md) for general versioning information
- Before cutting any releases, read the Apache's [Releases Policy](http://www.apache.org/dev/release)
- Replace `Android` with the platform you are releasing in the instructions below.

### Repository setup

You should have your platform repository checked out in a folder where you also have checked out all/most/some of the other Cordova repositories. If you followed the [Cloning/Updating Cordova repositories
](../README.md#cloningupdating-cordova-repositories) instructions of `cordova-coho`, this should already be the case.

## Before you start

### Read through Apache release policy

Read through the [Apache Releases Policy](http://www.apache.org/dev/release) as stated above. 

### Request buy-in

Email the dev mailing-list at <dev@cordova.apache.org> and see if anyone has reason to postpone the release.

E.g.:

    Subject: [DISCUSS] Cordova-Android Release

    Does anyone have any reason to delay a cordova-_android_ platform release?
    Any outstanding patches to land?

    If not, I will start the release tomorrow.

Double check you replace "Android" in the subject and mail body - there is no undo for emails.

Note that it would be possible to continue with some of the [Before Release](#before-release) items while waiting for a possible response.

## Before Release

### npm audit check

Ensure that the latest version of npm is installed (using a command such as `npm i npm@latest`), `package-lock.json` is present (do `npm i --package-lock-only` if needed), and then check:

    (cd cordova-android && npm audit)

### Check dependencies

Ensure your checkout of the repository is up-to-date:

    coho repo-update -r android

See if any dependencies are outdated

    (cd cordova-android && npm outdated --depth=0)

(The `--depth=0` prevents from listing dependencies of dependencies.)

### Resolve any outdated dependencies

**Alternative 1:**

- Explicitly pin the outdated dependency versions in the `dependencies` section of `package.json`.
- Raise a new JIRA issue to update the dependencies in an upcoming release.

**Alternative 2:**

Within a new JIRA issue: update any outdated dependencies in the project's `package.json` file. Be sure to run through the test section below for compatibility issues.

### License Check

Ensure license headers are present everywhere. For reference, see this [background](http://www.apache.org/legal/src-headers.html). Expect some noise in the output, for example some files from test fixtures will show up.

    coho audit-license-headers -r android | less

Ensure all dependencies and subdependencies have Apache-compatible licenses.

    coho check-license -r android

### Create JIRA issue

After waiting for any possible objections from the email sent according to the [Request buy-in](#request-buy-in) section above:

 * Create a JIRA issue to track the status of the release.
   - Make it of type "Task"
   - Title should be "Cordova-Android Platform Release _August 21, 2014_"
   - Description should be: "Following steps at https://github.com/apache/cordova-coho/blob/master/docs/platforms-release-process.md"
 * Comments should be added to this bug after each top-level step below is taken
 * Set a variable in your terminal for use later on


```
JIRA="CB-????" # Set this to the release bug.
```

## Prepare Release

Preparation of the release includes a) handling version numbers, b) creating nice release notes and c) creating the release branch.

### Optional: Set release version in `package.json`

This should be automatically done by the `coho prepare-platform-release-branch` command as described in [Create Release Branch](#create-release-branch) section below.

#### Remove the `-dev` suffix from version

This command removes `-dev` from the `version` entry in `package.json`:

    for l in cordova-android; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v = *-dev ]]; then v2="${v%-dev}"; echo "$l: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi) ; done

Note: This command [doesn't actually work](https://issues.apache.org/jira/browse/CB-13809). You can also replace `-dev` in `package.json` manually of course.

#### Optional: Increase version

If the changes merit it, also **manually** bump the major / minor/ patch version in `package.json`. 

To decide if this release merits it, view the changes via:

    ( cd cordova-android && git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags $(git rev-list --tags --max-count=1))..master )

Note: This command [doesn't work on Windows command line](https://issues.apache.org/jira/browse/CB-13901). But you can look at the changes since the last tag manually (or via the next step).

### Create Release Notes

Update the repos `RELEASENOTES.md` file with changes since the last release.

    coho update-release-notes -r android

(`--from-tag` and/or `--to-tag` may be needed in case of non-master branch)

Then curate:

    vim cordova-android/RELEASENOTES.md
    
or use your favorite text editor manually.

### Commit Release Notes and optional version changes together

Commit these changes together in a single commit (one commit).

    (cd cordova-android && v="$(grep '"version"' package.json | cut -d'"' -f4)" && git commit -am "$JIRA Update RELEASENOTES & version for release $v")

(Should be "$JIRA Update RELEASENOTES.md for release $v" in case `version` is not yet updated in `package.json`.)

### Special Case 1: Release notes in release branch for patch release

If you have prepared the release notes in your release branch for a patch release, you will have to cherry-pick the RELEASENOTES only into your master branch as well (stage only the appropriate chunk).

    git checkout master
    git checkout -p RELEASENOTES_COMMIT_SHA_HASH

For iOS, you may have to cherry-pick the commit for `Added X.Y.Z to CDVAvailability.h (via coho)` into the master branch as well.

### Special Case 2: releasing new commits from an already-existing release branch

If you are releasing new commits from an already-existing release branch, remember to merge in or cherry-pick relevant commits from master into the release branch!

### Create Release Branch

Create and prepare your release branch by using `coho prepare-platform-release-branch` command, which handles the following steps:

1. Creates a release branch `5.0.x` (if it doesn't already exist)
2. Updates `cordova.js` snapshot on both `5.0.x` and `master`
3. Propagates version number from `--version` argument (or from `package.json` if there is no `--version` argument) to all other files (`VERSION` and similar [e.g. `build.gradle` for Android]) on the release branch `5.0.x`
4. Prepares `master` for future development already: It gives version (`package.json`, `VERSION` and similar) a minor bump and adds `-dev` (=> `5.1.0-dev`) again

Run the following command (make sure to replace the version below with what is listed inside `package.json`) in case of release from the `master`:

    coho prepare-platform-release-branch --version 7.2.0 -r android

or in case of release from another release branch:

    coho prepare-platform-release-branch --version 7.1.1 -r android -b 7.1.x

Then ensure commits look okay on both branches

    coho repo-status -r android -b master -b 7.1.x

or verify manually (e.g. by looking at the git commit messages).

## Testing

Once all the repos are branched, we focus on testing & fixing all of the regressions we find.

### Prerequisite: npm test

Ensure that `npm test` succeeds locally.

Ensure that the continuous build, which checks the status of `npm test`, is green on GitHub.

### 1) Plugin tests with `cordova-mobile-spec` project

Create and run a [mobile-spec](https://github.com/apache/cordova-mobile-spec/) project:  

```
./cordova-mobile-spec/createmobilespec/createmobilespec.js --android --forceplugins
(cd mobilespec && cordova run android --device)
(cd mobilespec && cordova run android --emulator)
```
This should start a black-ish app with a "Plugin tests" button. When clicking it you end up in a screen with "Auto Tests" and "Manual Tests" buttons. You should run both and see if all/most/the expected ones succeed.

### 2) hello world app with `cordova` CLI

Create a hello world app using the `cordova` CLI:

```
cordova create ./androidTest org.apache.cordova.test androidTest
(cd androidTest && cordova platform add ../cordova-android)
(cd androidTest && cordova run android --device)
(cd androidTest && cordova run android --emulator)
```
This should create an app showing the Cordova logo, "Apache Cordova" and a green "Device is ready" box.

### 3) `/bin` scripts 

Run your platform's `./bin/create` script and run the resulting project:

```
./cordova-android/bin/create ./androidTest2 org.apache.cordova.test2 androidTest2
(cd androidTest2 && ./cordova/build)
(cd androidTest2 && ./cordova/run --device)
(cd androidTest2 && ./cordova/run --emulator)
```
This should create an app showing a white screen. 
Ensure the generated project files also build through an IDE.

The output from `./cordova/version` should show the new version you defined above.

### 4) `cordova-lib` tests

Run cordova-lib tests.

```
(cd cordova-lib/cordova-lib && npm test)
```
    
### 5) Clean up

Clean up the project(s) you just created.

```
rm -rf androidTest*
```

### When a regression is found

Create a JIRA issue for it, and mark it as a blocker.

### To submit a fix

    git checkout master
    git commit -am 'Your commit message'
    git push origin master
    git log     # note the first five or six digits of the commit hash
    git checkout 5.0.x
    git cherry-pick -x commit_hash
    # git push origin 5.0.x

## Push Changes

**Attention**: This is the moment of truth: The following actions will push your work to the remote repository. Until now you only worked locally and could just delete everything if something went wrong. From here on this will get more difficult.

### Push commits

All good? Have another look at the changes:

    coho repo-status -r android -b master -b 7.1.x

If changes look right:

    coho repo-push -r android -b master -b 5.0.x

This pushes the commits in both `master` and `7.1.x` (the release branch) to the remote.

### Tag and push tag

Before you tag, run this command:

    coho tag-platform-release --version 7.1.0 -r android --pretend
    
Seems okay? Then execute it by running:

    coho tag-platform-release --version 7.1.0 -r android

This command also tags `cordova-js` with `android-7.1.0` and pushes it.

To tag without automatic push:

    coho tag-platform-release --version 7.1.0 -r android --tag-only

and then manually push the new tags.

## Publish Release Candidate to `dist/dev`

**Attention**: The following steps need [SVN](https://subversion.apache.org/packages.html#windows) installed and [unfortunately don't give an error if it is not, failing silently](https://issues.apache.org/jira/browse/CB-8006). You also need do [have a secret key set up](setting-up-gpg.md) for signing the release.

Ensure you have the svn repos checked out:

    coho repo-clone -r dist -r dist/dev

Create archives from your tags:

    coho create-archive -r android --dest cordova-dist-dev/$JIRA --tag 5.0.0

Sanity Check:

    coho verify-archive cordova-dist-dev/$JIRA/*.tgz

Upload:

    (cd cordova-dist-dev && svn add $JIRA && svn commit -m "$JIRA Uploading release candidates for android release")

If everything went well the Release Candidate will show up here: https://dist.apache.org/repos/dist/dev/cordova/

## Documentation and Communication

### Documentation To Update

For your platform:

 1. Ensure the [Upgrade Guide](http://cordova.apache.org/docs/en/latest/guide/platforms/android/upgrade.html) for your platform is up-to-date
 2. Ensure the other guides listed in the sidebar are up-to-date for your platform

### Prepare Blog Post

 * Gather highlights from `RELEASENOTES.md` into a Release Announcement blog post
 * Instructions on publishing a blog post are on the [`cordova-docs` repo](https://github.com/apache/cordova-docs#writing-a-blog-post)
 * Get blog post proofread by submitting a PR to `cordova-docs` and asking someone on dev list to +1 it.

## Voting and Release

### Start VOTE Thread

Send an email to dev ML with: (replace `android` with your platform)

__Subject:__

    [VOTE] Cordova-Android 5.0.0 Release

__Body:__

    Please review and vote on this 5.0.0 Android Release
    by replying to this email (and keep discussion on the DISCUSS thread)

    Release issue: https://issues.apache.org/jira/browse/CB-XXXX

    The archive has been published to dist/dev:
    https://dist.apache.org/repos/dist/dev/cordova/CB-XXXX

    The package was published from its corresponding git tag:
    ### PASTE OUTPUT OF: coho print-tags -r android --tag 5.0.0 ###

    Note that you can test it out via:

        cordova platform add https://github.com/apache/cordova-android#5.0.0

    Upon a successful vote I will upload the archive to dist/, publish it to npm, and post the blog post.

    Voting guidelines: https://github.com/apache/cordova-coho/blob/master/docs/release-voting.md

    Voting will go on for a minimum of 48 hours.

    I vote +1:
    * Ran coho audit-license-headers over the relevant repos
    * Ran coho check-license to ensure all dependencies and subdependencies have Apache-compatible licenses
    * Ensured continuous build was green when repo was tagged
    * ### Add all the other things you did to confirm the working of the release ###


### Email the result of the vote

Respond to the vote thread with:

    The vote has now closed. The results are:

    Positive Binding Votes: (# of PMC members that +1'ed)

    .. names of all +1 PMC members ..

    Negative Binding Votes: (# of PMC members that -1'ed)

    .. names of all -1 PMC members ..

    The vote has passed.

If there were any votes from non-pmc, include them in an additional `Non-Binding` section.

    Positive Non-Binding Votes: (# that +1'ed)

    .. names of all +1 non-PMC members ..

    Negative Non-Binding Votes: (# that -1'ed)

    .. names of all -1 non-PMC members ..

_Note: list of PMC members: http://people.apache.org/phonebook.html?pmc=cordova_

### If the Vote does *not* Pass

* Revert adding of `-dev`
* Address the concerns
* Re-tag release using `git tag -f`
* Add back `-dev`
* Start a new vote

### Otherwise: Publish real release to `dist/` & npm

First move the release package files to `dist/`:

(replace `android` with your platform)

    cd cordova-dist
    svn up
    svn rm platforms/cordova-android*
    cp ../cordova-dist-dev/$JIRA/cordova-android* platforms/
    svn add platforms/cordova-android*
    svn commit -m "$JIRA Published android release to dist"

Now you can find your release here: https://dist.apache.org/repos/dist/release/cordova/

Then you can also remove the release candidate from `dist-dev/`:

    cd ../cordova-dist-dev
    svn up
    svn rm $JIRA
    svn commit -m "$JIRA Removing release candidates from dist/dev"
    cd ..

And finally you can publish your package to `npm`:

    cd cordova-dist
    npm publish platforms/cordova-android-5.0.0.tgz

Note: On Windows you have to replace `/` with `\` for this command to work.

Check online if everything worked: https://www.npmjs.com/package/cordova-windows

You should now also be able to add your platform via the version number using the CLI:

    cordova create platformTest
    cd platformTest
    cordova platform add android@5.0.0

### (Android only) Uploading to Bintray

1. Add the cordova bintray username and API key as system variables. Your `BINTRAY_USER` should be the username "cordova". The API key is available on the [bintray cordova "edit profile" page](https://bintray.com/profile/edit) - the last option in the menu on the left is "API Key". Find it there. [Credentials to log into the bintray site are on the PMC private SVN](https://svn.apache.org/repos/private/pmc/cordova/logins/bintray.txt). If you have trouble, ask the Project Management Committee (pmc) for the credentials. Confirm that your key and user name are set:

```
echo $BINTRAY_USER
echo $BINTRAY_KEY
```

2. Run the following command (replace 6.2.2 with released version):

```
(cd cordova-android/framework && git checkout 6.2.2 && gradle bintrayUpload)
```

3. Load up the bintray webpage for cordova-android: https://bintray.com/cordova/maven/cordova-android. You should see a notification/warning about publishing the latest release. Hit the Publish link!

### Add permanent Apache release tag to repository

Make a copy of your released tag with a prefix of `rel/YOURTAG`:

    (cd cordova-android; git checkout 5.1.0; git tag rel/5.1.0; git push origin --tags; git checkout master)

These are permanent release tags for Apache.

## Follow up steps

### Tell Apache about Release

1. Go to: https://reporter.apache.org/addrelease.html?cordova
2. Use `cordova-$PLATFORM@x.x.x` as "Full version name"
3. Click "Update release data" to submit it to the list

### Email a release announcement to the mailing list

    Subject: [ANNOUNCEMENT] Cordova Android 5.0.0 Release
    
    Cordova-windows@VERSION has been released!

### Announce It!

Announce the release to the world!

* Publish the release blog post
* Tweet it on https://twitter.com/apachecordova
   
### Close JIRA Issue

- Double check that the issue includes comments that record the steps you took
- Mark it as fixed

### Finally

- Update these instructions if they were missing anything.
- That's it!

----

##  Other stuff that should be reviewed and moved up to the appropriate places

### Update the Docs

Follow the README at https://github.com/apache/cordova-docs, and specifically the deploy section: https://github.com/apache/cordova-docs#deploying



### Moving Tags

If you need to move a tag before the release, here is how to do that:

    $ git tag -d 3.1.0
    Deleted tag '3.1.0' (was 2a9bc20)
    $ git push origin :refs/tags/3.1.0
    To https://git-wip-us.apache.org/repos/asf/cordova-docs.git
     - [deleted]         3.1.0
    $ git tag 3.1.0 7cf9fea03d7d02a13aef97a09a459e8128bd3198
    $ git push origin 3.1.0 && git push origin refs/tags/3.1.0
    Total 0 (delta 0), reused 0 (delta 0)
    To https://git-wip-us.apache.org/repos/asf/cordova-docs.git
     * [new tag]         3.1.0 -> 3.1.0
    git commit --allow-empty -m "empty commit to update tag on github mirror"
    git push origin

Then send a note to the mailing list:

    To verify you have the updated tag in your local clone, doing a "git rev-parse 3.1.0" in cordova-docs should reply with "7cf9fea03d7d02a13aef97a09a459e8128bd3198". If it is wrong, do "git fetch --tags".

