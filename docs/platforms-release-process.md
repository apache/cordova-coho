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

# Release Process for ''Platforms Releases''

Before cutting any releases, read the Apache's [Releases Policy](http://www.apache.org/dev/release)

This page describes the technical steps for releasing a `Platforms Release` (see: [versioning-and-release-strategy.md](versioning-and-release-strategy.md)).

TODO: We may want to be using [signed tags](http://git-scm.com/book/en/Git-Basics-Tagging), or at least annotated tags.

Replace `Android` with the platform you are releasing. 

## Get Buy-in

Email the dev mailing-list and see if anyone has reason to postpone the release.

E.g.:

    Subject: [DISCUSS] Cordova-Android Release

    Does anyone have any reason to delay a cordova-android platform release?
    Any outstanding patches to land?

    If not, I will start the release tomorrow.

## Creating JIRA issues

 * Create a JIRA issue to track the status of the release.
   * Make it of type "Task"
   * Title should be "Cordova-Android Platform Release _August 21, 2014_"
   * Description should be: "Following steps at https://github.com/apache/cordova-coho/blob/master/docs/platforms-release-process.md"
 * Comments should be added to this bug after each top-level step below is taken
 * Set a variable in your terminal for use later on:


    JIRA="CB-????" # Set this to the release bug.

## Branch & Tag for Platform Repository

### Before creating the release branch:

 1. Run [Apache RAT](http://creadur.apache.org/rat/) to ensure copyright headers are present
   * `coho audit-license-headers -r android | less`
 2. Update the copy of app-hello-world (if there were any changes to it)
   * This usually lives within bin/templates somewhere
   * TODO: More details needed here
 3. For iOS only:
   * Update [CordovaLib/Classes/CDVAvailability.h](https://github.com/apache/cordova-ios/blob/master/CordovaLib/Classes/CDVAvailability.h)

by adding a new macro for the new version, e.g.

    #define __CORDOVA_2_1_0  20100


and update `CORDOVA_VERSION_MIN_REQUIRED` with the latest version macro, e.g.

    #ifndef CORDOVA_VERSION_MIN_REQUIRED
        #define CORDOVA_VERSION_MIN_REQUIRED __CORDOVA_2_1_0
    #endif

### Creating the release branch

This step involves:
 * Updating cordova.js snapshot
 * Updating version numbers
 * Creating a release branch
 * Creating git tags for platform and js
 * Updating version in package.json file

Coho automates these steps:

    coho prepare-release-branch --version 3.5.0 -r android
    coho repo-status -r android -b master -b 3.5.x
    # If changes look right:
    coho repo-push -r android -b master -b 3.5.x
    coho tag-release --version 3.5.0 -r android

## Tagging RC1 of cordova-cli

cordova-cli doesn't use a release branch. Follow the instructions at [tools-release-process.md](tools-release-process.md), but in addition:

Update the tool to point to the new repo versions (within `cordova-cli/platforms.js`)

Instead of the normal `npm publish` flow:

    npm publish --tag rc

** WATCH OUT! You may have to run `npm tag cordova@x.x.x latest` due to a bug in npm: https://github.com/npm/npm/issues/4837

## Publish RC to dist/dev
Ensure you have the svn repos checked out:

    coho repo-clone -r dist -r dist/dev
    
Create archives from your tags:

    coho foreach -r android "git checkout 3.5.x"
    coho create-archive -r android --dest cordova-dist-dev/$JIRA/rc

Sanity Check:

    coho verify-archive cordova-dist-dev/$JIRA/rc/*.zip

Upload: (replace `android` with your platform)

    (cd cordova-dist-dev && svn add $JIRA && svn commit -m "$JIRA Uploading release candidates for android release")

Find your release here: https://dist.apache.org/repos/dist/dev/cordova/

## Testing & Documentation

Once all the repos are branched & tagged, we focus on testing & fixing all of the regressions we find.

When a regression is found:

 * Create a JIRA issue for it, and mark it as a blocker.

To submit a fix:

    git checkout master
    git commit -am 'Your commit message'
    git push origin master
    git log     # note the first five or six digits of the commit hash
    git checkout 3.5.x
    git cherry-pick -x commit_hash
    git push origin 3.5.x

### What to Test

 * Run [mobile-spec](http://git-wip-us.apache.org/repos/asf/cordova-mobile-spec.git)
   * Don't forget to checkout mobile-spec at the appropriate tag instead of using master.
   * Don't forget to set up your white-list
   * Don't forget to run through the manual tests in addition to the automatic tests
   * Test loading the app over HTTP (via "cordova serve" and setting the config.xml start page)
 * Run your platform's ./bin/create script
   * Ensure generated project builds & runs both through an IDE and through the cordova/* scripts
 * Test Project Upgrades (old-style):
   1. Create a project using the previous version of cordova
     * `coho foreach -r android "git checkout 3.4.0"`
     * `coho foreach -r android "./bin/create foo org.apache.foo foo"`
   2. Upgrade the project via the bin/update_project script:
     * `coho foreach -r android "git checkout 3.5.x"`
     * `coho foreach -r android "cd foo && ../bin/update_project"`
   3. Test the result:
     * Project should run
     * cordova/version should report the new version
 * Test Project Upgrades (new-style):
   1. Create a project using the previous version of cordova
     * `coho foreach "git checkout 3.4.0"`
     * `./cordova-mobile-spec/createmobilespec.sh`
   2. Upgrade the project via the update command:
     * `../cordova-cli/bin/cordova platform update android`
   3. Test the result:
     * Project should run
     * cordova/version should report the new version
     * Mobile Spec should still run.

#### Android Extras

 * Unit tests in: [test](https://github.com/apache/incubator-cordova-android/tree/master/test) directory

#### iOS Extras

 * Unit tests in: [CordovaLibTests/CordovaTests.xcodeproj](https://git-wip-us.apache.org/repos/asf?p=cordova-ios.git;a=tree;f=CordovaLibTests;h=88ba8e3c286159151b378efb1b0c39ef26dac550;hb=HEAD)
 * Test the Makefile via `make`
 * Run `bin/diagnose_project` on a newly created project and ensure it reports no errors.

### Documentation To Update

For your platform:
 1. Update RELEASENOTES.md (if the file is missing, use the iOS one as a reference: [RELEASENOTES.md](https://github.com/apache/cordova-ios/blob/master/RELEASENOTES.md))

Grab changes from the previous release until now.

    # Changes:
    git log --pretty=format:'* %s' --topo-order --no-merges origin/3.4.x..origin/3.5.x
    # Commit count:
    git log --pretty=format:'* %s' --topo-order --no-merges origin/3.4.x..origin/3.5.x | wc -l
    # Author Count:
    git log --pretty=format:'%an' --topo-order --no-merges origin/3.4.x..origin/3.5.x | sort | uniq | wc -l

Edit the commit descriptions - don't add the commits verbatim, usually they are meaningless to the user. Only show the ones relevant for the user (fixes, new features)

 2. Update README.md (if necessary)
 3. Ensure the [Upgrade Guide](http://docs.phonegap.com/en/edge/guide_upgrading_index.md.html) for your platform is up-to-date
 4. Ensure the other guides listed in the sidebar are up-to-date for your platform


## Publish final archives to dist/dev
Create archives from your tags:

    coho foreach -r android "git checkout 3.5.x"
    coho create-archive -r android --dest cordova-dist-dev/$JIRA/final

Sanity Check:

    coho verify-archive cordova-dist-dev/$JIRA/final/*.zip

Upload: (replace `android` with your platform) 

    (cd cordova-dist-dev && svn add $JIRA/final && svn commit -m "$JIRA Uploading archives for android release vote")

Find your release here: https://dist.apache.org/repos/dist/dev/cordova/

## Prepare Blog Post
 * Gather highlights from RELEASENOTES.md into a Release Announcement blog post
   * Instructions on [sites page README](https://svn.apache.org/repos/asf/cordova/site/README.md)
 * Get blog post proofread via [Github](http://github.com/cordova/apache-blog-posts).

## Start VOTE Thread
Send an email to dev ML with: (replace `android` with your platform)

__Subject:__

    [Vote] 3.5.0 Android Release

__Body:__

    Please review and vote on this 3.5.0 Android Release.

    Release issue: https://issues.apache.org/jira/browse/CB-XXXX

    Repos ready to be released have been published to dist/dev:
    https://dist.apache.org/repos/dist/dev/cordova/CB-XXXX/final

    The packages were published from their corresponding git tags:
    PASTE OUTPUT OF: coho print-tags -r android

    Upon a successful vote I will upload the archives to dist/, publish them to NPM, and post the corresponding blog post.

    Voting guidelines: https://github.com/apache/cordova-coho/blob/master/docs/release-voting.md

    Voting will go on for a minimum of 48 hours.

    I vote +1:
    * Ran coho audit-license-headers over the relevant repos
    * Used `license-checker` to ensure all dependencies have Apache-compatible licenses
    * Ensured continuous build was green when repo was tagged


## Email the result of the vote
Respond to the vote thread with:

    The vote has now closed. The results are:

    Positive Binding Votes: (# of PMC members that +1'ed)

    .. names of all +1 PMC members ..

    Negative Binding Votes: (# of PMC members that -1'ed)

    .. names of all -1 PMC members ..

    The vote has passed.

_Note: list of PMC members: http://people.apache.org/committers-by-project.html#cordova-pmc_

## If the Vote does *not* Pass
* Revert adding of `-dev`
* Address the concerns
* Re-tag release using `git tag -f`
* Add back `-dev`
* Start a new vote

## Otherwise: Publish to dist/

(replace `android` with your platform)

    cd cordova-dist
    svn up
    svn rm platforms/cordova-android*
    cp ../cordova-dist-dev/$JIRA/final/cordova-android* platforms/
    svn add platforms/cordova-android*
    svn commit -m "$JIRA Published android release to dist"

    cd ../cordova-dist-dev
    svn up
    svn rm $JIRA
    svn commit -m "$JIRA Removing release candidates from dist/dev"
    cd ..


Find your release here: https://dist.apache.org/repos/dist/release/cordova/

## Final Details

### Update cordova.apache.org

 * Refer to [this commit](http://svn.apache.org/viewvc?view=revision&revision=r1478146) (also includes updating the DOAP file)
 * And the instructions at https://svn.apache.org/repos/asf/cordova/site/README.md

### Update the Docs
TODO: Change this to new docs release process; maybe with tools process?

 1. Upload the new docs to http://cordova.apache.org/docs
   * Website README.md explains [How to update the docs](https://svn.apache.org/repos/asf/cordova/site/README.md)
   * Commit should look like [this one](http://svn.apache.org/viewvc?view=revision&revision=r1478171)
 1. Ask Michael Brooks to update the docs.cordova.io redirect.
   * Check out the branch `cordova-labs:redirect-docs-cordova-io`
   * Repository README.md explains [How to update the HTTP redirect](https://github.com/apache/cordova-labs/tree/redirect-docs-cordova-io#usage)
   * Nodejitsu is limited to one deployer, so Michael Brooks is currently the point of contact.

### Push platforms and tools to npm
Refer to [tools-release-process.md](tools-release-process.md)

### Tell JIRA it's Released

 * Visit https://issues.apache.org/jira/plugins/servlet/project-config/CB/versions
 * Fill in the Release Date field and mark it as released.

### Announce It!
 1. Announce the release to the world!
   * Create a blog post for it (instructions on [sites page README](https://svn.apache.org/repos/asf/cordova/site/README.md))
   * Tweet it on https://twitter.com/apachecordova
   * Announce to [G+ Page](https://plus.google.com/u/0/113178331525415522084/posts)
   * Get it posted to Apache's announce mailing list: send an mail to announce@apache.org, sent from your @apache.org email address. Send in plain text, and copy the model of other announcements in the archive(s). You'll then need to wait for the moderator to accept the message. The www.a.o home page is automatically updated with the announcement after the moderator approves.
   * For major project milestones, email press@apache.org and they can provide custom help.

# Additional Information
 * [IOSReleaseChecklist](https://wiki.apache.org/cordova/IOSReleaseChecklist)
 * [AndroidReleaseChecklist](https://wiki.apache.org/cordova/AndroidReleaseChecklist)

## Moving Tags

If you need to move a tag before the release, here is how to do that:

    $ git tag -d 3.1.0
    Deleted tag '3.1.0' (was 2a9bc20)
    $ git push origin :refs/tags/3.1.0
    To https://git-wip-us.apache.org/repos/asf/cordova-docs.git
     - [deleted]         3.1.0
    $ git tag 3.1.0 7cf9fea03d7d02a13aef97a09a459e8128bd3198
    $ git push origin 3.1.0 --tags
    Total 0 (delta 0), reused 0 (delta 0)
    To https://git-wip-us.apache.org/repos/asf/cordova-docs.git
     * [new tag]         3.1.0 -> 3.1.0

Then send a note to the mailing list:

    To verify you have the updated tag in your local clone, doing a "git rev-parse 3.1.0" in cordova-docs should reply with "7cf9fea03d7d02a13aef97a09a459e8128bd3198". If it is wrong, do "git fetch --tags".

