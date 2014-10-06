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

# Release Process for ''Cadence Releases''

Before cutting any releases, read the Apache's [Releases Policy](http://www.apache.org/dev/release)

This page describes the technical steps for releasing a `Cadence Release` (see: [versioning-and-release-strategy.md](versioning-and-release-strategy.md)).

TODO: We may want to be using [signed tags](http://git-scm.com/book/en/Git-Basics-Tagging), or at least annotated tags.

## Getting Buy-in & Assigning a Release Manager

 1. Email the dev mailing-list and see if anyone has reason to postpone the release.
   * If so, agree upon a branching date / time.
 1. Ask for a volunteer to be Release Manager for the release (or volunteer yourself)

## Creating JIRA issues

* Create the release bug for the Release Candidate:

      `coho create-release-bug --version=3.6.0 --username=JiraUser --password=JiraPassword`
    
* Comments should be added to this bug after each top-level step below is taken

* Set a variable for use later on:

    `JIRA="CB-????"` # Set this to the release bug.

## Branch & Tag for: cordova-js, cordova-mobile-spec and cordova-app-hello-world

This should be done *before* creating branches on other repos.

This step involves:
 * Updating version numbers
 * Creating release branches
 * Creating git tags

Before going further, make sure all your repos are on a named branch and not in a "detached head" state:
   * `coho for-each -r android -r js -r app-hello-world -r mobile-spec "git checkout master"`

If you are trying to use a different version between the JS and the platforms (ie, 3.6.1 vs 3.6.3), the coho scripts won't behave nicely. It is highly recommended to use the same major.minor.patch number throughout all items in this cadence release (except the tools (lib, plugman, cli)).

Coho automates these steps:

    coho prepare-release-branch --version 3.6.0 -r js -r app-hello-world -r mobile-spec
    coho repo-status -r js -r app-hello-world -r mobile-spec -b master -b 3.6.x
    # If changes look right:
    coho repo-push -r js -r app-hello-world -r mobile-spec -b master -b 3.6.x
    coho tag-release --version 3.6.0 -r js -r app-hello-world -r mobile-spec

If the JS ever needs to be re-tagged, rerun the `tag-release` command, and then re-run the `prepare-release-branch` command for the platform repos.

## Branch & Tag for Platform Repositories

### Before creating the release branch:

 1. Run [Apache RAT](http://creadur.apache.org/rat/) to ensure copyright headers are present. Also see this [background](http://www.apache.org/legal/src-headers.html).
   * `coho audit-license-headers -r android | less`
 1. Run check-license to ensure all dependencies and subdependencies have valid licenses
   * `coho check-license -r platform`
 1. Update the copy of app-hello-world (if there were any changes to it)
   * This usually lives within bin/templates somewhere
   * TODO: More details needed here
 1. Update your local cordova-js
   * `coho repo-update -r js`
 1. Update `RELEASENOTES.md` by pasting the output from `git log --pretty=format:'* %s' --topo-order --no-merges origin/3.5.x..origin/3.6.x`
 1. For iOS only:
   * Update [CordovaLib/Classes/CDVAvailability.h](https://github.com/apache/cordova-ios/blob/master/CordovaLib/Classes/CDVAvailability.h)

by adding a new macro for the new version, e.g.

    #define __CORDOVA_3_6_0  30600


and update `CORDOVA_VERSION_MIN_REQUIRED` with the latest version macro, e.g.

    #ifndef CORDOVA_VERSION_MIN_REQUIRED
        #define CORDOVA_VERSION_MIN_REQUIRED __CORDOVA_3_6_0
    #endif

### Creating the release branch

This step involves:
 * Updating cordova.js snapshots
 * Updating version numbers
 * Creating release branches
 * Creating git tags
 * Updating version in package.json files

Coho automates these steps (replace android with your platform):

    coho prepare-release-branch --version 3.6.0 -r android
    coho repo-status -r android -b master -b 3.6.x
    # If changes look right:
    coho repo-push -r android -b master -b 3.6.x
    coho tag-release --version 3.6.0 -r android

## Tagging RC of cordova-cli, cordova-lib, cordova-plugman

These tools don't use a release branch. There is a different process:

  1. Follow the instructions at [tools-release-process.md](tools-release-process.md). This should include updating `cordova-js` dependency for `cordova-lib`, and updating `cordova-lib` dependency for `corodva-cli` and `cordova-plugman`.
  2. Update the tools to point to the new repo versions (within `cordova-lib/cordova-lib/src/cordova/platforms.js`). This is necessary for the tools to use the new platform versions.

## Publish RC to dist/dev

Ensure you have the svn repos checked out:

    coho repo-clone -r dist -r dist/dev
    
Create archives from your tags:

    coho create-archive -r tools --dest cordova-dist-dev/$JIRA
    coho create-archive -r cadence --dest cordova-dist-dev/$JIRA --tag 3.6.0

If JS was branched then you will also have to run:

    coho create-archive -r js --dest cordova-dist-dev/$JIRA --tag 3.6.0

Sanity Check:

    coho verify-archive cordova-dist-dev/$JIRA/*.zip cordova-dist-dev/$JIRA/*.tgz

Upload:

    (cd cordova-dist-dev && svn add $JIRA && svn commit -m "$JIRA Uploading release candidates for cadence release")

Find your release here: https://dist.apache.org/repos/dist/dev/cordova/

## Do not publish the RC to NPM

Once a name-version is published to the npm registry, it cannot be updated. Ever. And the name-version is parsed from the package.json file. So to move from an RC to final would require a change in the package.json file, which would invalidate any Apache vote. Defer the npm publishing until after the vote is complete and has passed.

## Testing & Documentation

Once all the repos are branched & tagged, we focus on testing & fixing all of the regressions we find.

When a regression is found:

 * Create a JIRA issue for it, and mark it as a blocker.

To submit a fix:

    git checkout master
    git commit -am 'Your commit message'
    git push origin master
    git log     # note the first five or six digits of the commit hash
    git checkout 3.6.x
    git cherry-pick -x commit_hash
    git push origin 3.6.x

### What to Test

 * Run [mobile-spec](http://git-wip-us.apache.org/repos/asf/cordova-mobile-spec.git)
   * Don't forget to checkout mobile-spec at the appropriate tag instead of using master.
   * Don't forget to set up your white-list
   * Don't forget to run through the manual tests in addition to the automatic tests
   * Test loading the app over HTTP (via "cordova serve" and setting the config.xml start page)
 * Run each platform's ./bin/create script
   * Ensure generated project builds & runs both through an IDE and through the cordova/* scripts
 * Test Project Upgrades (old-style):
   1. Create a project using the previous version of cordova
     * `coho foreach "git checkout 2.9.0"`
     * `coho foreach -r active-platform "./bin/create foo org.apache.foo foo"`
   2. Upgrade the project via the bin/update_project script:
     * `coho foreach "git checkout 3.0.x"`
     * `coho foreach -r active-platform "cd foo && ../bin/update_project"`
   3. Test the result:
     * Project should run
     * cordova/version should report the new version
 * Test Project Upgrades (new-style):
   1. Create a project using the previous version of cordova
     * `coho foreach "git checkout 2.9.0"`
     * `./cordova-mobile-spec/createmobilespec.sh`
   2. Upgrade the project via the update command:
     * `../cordova-cli/bin/cordova platform update PLATFORM`
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

For each repository:
 1. Update RELEASENOTES.md (if the file is missing, use the iOS one as a reference: [RELEASENOTES.md](https://github.com/apache/cordova-ios/blob/master/RELEASENOTES.md))

Grab changes from the previous release until now.

    # Changes:
    git log --pretty=format:'* %s' --topo-order --no-merges origin/3.2.x..origin/3.3.x
    # Commit count:
    git log --pretty=format:'* %s' --topo-order --no-merges origin/3.2.x..origin/3.3.x | wc -l
    # Author Count:
    git log --pretty=format:'%an' --topo-order --no-merges origin/3.2.x..origin/3.3.x | sort | uniq | wc -l

Edit the commit descriptions - don't add the commits verbatim, usually they are meaningless to the user. Only show the ones relevant for the user (fixes, new features)

 2. Update README.md (if necessary)
 3. Ensure the [Upgrade Guide](http://docs.phonegap.com/en/edge/guide_upgrading_index.md.html) for your platform is up-to-date
 4. Ensure the other guides listed in the sidebar are up-to-date for your platform

## Branching & Tagging cordova-docs

 1. Generate the en docs for the release (i.e., en/3.5.0)
 2. Commit this new version directory & tag on master.

See [Generating a Version Release](https://git-wip-us.apache.org/repos/asf?p=cordova-docs.git;a=blob;f=README.md#l127) for more details.

## Prepare Blog Post
 * Combine highlights from RELEASENOTES.md into a Release Announcement blog post
   * Instructions on [sites page README](https://svn.apache.org/repos/asf/cordova/site/README.md)
 * Get blog post proofread via [piratepad](http://piratepad.net/front-page/).

## Start VOTE Thread
Send an email to dev ML with:

__Subject:__

    [Vote] 3.6.0 Cadence Release

__Body:__

    Please review and vote on this 3.6.0 Cadence Release.

    Release issue: https://issues.apache.org/jira/browse/CB-XXXX

    Repos ready to be released have been published to dist/dev:
    https://dist.apache.org/repos/dist/dev/cordova/CB-XXXX/final

    The packages were published from their corresponding git tags:
    PASTE OUTPUT OF: coho print-tags -r cadence --tag 3.6.0

    Upon a successful vote I will upload the archives to dist/, publish them to NPM, and post the corresponding blog post.

    Voting guidelines: https://github.com/apache/cordova-coho/blob/master/docs/release-voting.md

    Voting will go on for a minimum of 72 hours.

    I vote +1:
    * Ran coho audit-license-headers over the relevant repos
    * Ran coho check-license to ensure all dependencies and subdependencies have Apache-compatible licenses
    * Ensured continuous build was green when repos were tagged


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

## Otherwise: Publish to dist/ & npm

    cd cordova-dist
    svn up
    svn rm tools/cordova-js*
    svn rm tools/cordova-lib*
    svn rm tools/plugman-*
    svn rm tools/cordova-3*
    svn rm tools/cordova-app-hello*
    svn rm tools/cordova-mobile-spec*
    svn rm platforms/*
    cp ../cordova-dist-dev/$JIRA/cordova-js* tools/
    cp ../cordova-dist-dev/$JIRA/cordova-3* tools/
    cp ../cordova-dist-dev/$JIRA/cordova-lib* tools/
    cp ../cordova-dist-dev/$JIRA/plugman* tools/
    cp ../cordova-dist-dev/$JIRA/cordova-mobile-spec* tools/
    cp ../cordova-dist-dev/$JIRA/cordova-app-hello* tools/
    cp ../cordova-dist-dev/$JIRA/cordova-ios* platforms/
    cp ../cordova-dist-dev/$JIRA/cordova-android* platforms/
    cp ../cordova-dist-dev/$JIRA/cordova-blackberry* platforms/
    cp ../cordova-dist-dev/$JIRA/cordova-windows* platforms/
    cp ../cordova-dist-dev/$JIRA/cordova-wp8* platforms/
    cp ../cordova-dist-dev/$JIRA/cordova-firefoxos* platforms/
    cp ../cordova-dist-dev/$JIRA/cordova-ubuntu* platforms/
    cp ../cordova-dist-dev/$JIRA/cordova-amazon-fireos* platforms/
    svn add tools/*
    svn add platforms/*
    svn commit -m "$JIRA Published cadence release to dist"
    
For each package to be released, replace `cordova-android` with the package name and `3.6.0` with the new version. 

Protip: The version is in the filename. `latest` is the public release tag on npm. 

Note: when doing the `npm publish` make sure you are using a recent version of node stable (v0.10 or greater). Do not use an experimental version of node such as v0.11 since behavior may be unpredictable when using something other than a stable version of node.

    cd ../cordova-dist-dev/$JIRA

Publish all at once:

    for package in $(find *.tgz); do $(npm publish --tag rc $package); done;
    
Or publish one package at a time:

    npm publish --tag rc cordova-android-3.6.0.tgz

Note: You need to be an owner for each of these repos and the versions can't already have been published. You want to publish with the rc tag, so you can move everything to "latest" all at once after they have all been published.

Do a quick test of the rc version:

    npm -g uninstall cordova
    npm -g install cordova@rc
    cordova create mytest com.example.mytest MyTest
    cd mytest
    cordova platform add android
    cordova plugin add org.apache.cordova.device
    cordova run android

Tag this new version in npm as the latest:

    npm tag cordova@3.6.0-0.2.8 latest
    npm tag cordova-android@3.6.0 latest

Repeat the tagging as "latest" for all the npm packages (platforms and tools). You can check your work by running "npm info cordova-android" and look at the value for 'dist-tags'.

Note that it is not possible to remove the "rc" tag. But it should now point to the same place as "latest".
    
Remove RCs from dist/dev

    cd ../cordova-dist-dev
    svn up
    svn rm $JIRA
    svn commit -m "$JIRA Removing release candidates from dist/dev"
    cd ..

Find your release here: https://dist.apache.org/repos/dist/release/cordova/

## Final Details

### Update cordova.apache.org

 * cd ../cordova-website
 * svn update
 * Refer to [this commit](http://svn.apache.org/viewvc?view=revision&revision=r1478146) which also includes updating the DOAP file. But instead of editing `bin/config.json` you should edit `_config.yml` instead. And don't bother updating `public/index.html` as it gets automatically generated from `www/index.html` and `_config.yml` instead.
 * If you have already written a blog entry, insert it now.
 * And the instructions at https://svn.apache.org/repos/asf/cordova/site/README.md

### Update the Docs
 1. Upload the new docs to http://cordova.apache.org/docs
   * Website README.md explains [How to update the docs](https://svn.apache.org/repos/asf/cordova/site/README.md)
   * Commit should look like [this one](http://svn.apache.org/viewvc?view=revision&revision=r1478171)
 1. Have a Heroku collaborator update the docs.cordova.io redirect to the new version.
   * Check out the branch `cordova-labs:redirect-docs-cordova-io`
   * Repository README.md explains [How to update the HTTP redirect](https://github.com/apache/cordova-labs/tree/redirect-docs-cordova-io#usage)
   * If you would like to become a Heroku collaborator, get an account on heroku.com and email the dev list with your Heroku id so someone can add you.

### Tell JIRA it's Released

 * Visit https://issues.apache.org/jira/plugins/servlet/project-config/CB/versions
 * Fill in the Release Date field and mark it as released.

### Announce It!
 1. Announce the release to the world!
   * Create a blog post for it (instructions on [sites page README](https://svn.apache.org/repos/asf/cordova/site/README.md))
   * Tweet it on https://twitter.com/apachecordova
   * Announce to [G+ Page](https://plus.google.com/u/0/113178331525415522084/posts)
   * Get it posted to Apache's announce mailing list: send an mail to announce@apache.org, sent from [your @apache.org email address](https://reference.apache.org/committer/email). Send in plain text, and copy the model of other announcements in the archive(s). You'll then need to wait for the moderator to accept the message. The www.a.o home page is automatically updated with the announcement after the moderator approves. And it will get sent out to subscribers. Be aware that your email will be distributed exactly as you send it, so don't add any comments for the moderator, and do get the formatting (including the subject line) exactly as you want it to appear to users.
   * For major project milestones, email press@apache.org and they can provide custom help.

# Additional Information
 * [IOSReleaseChecklist](https://wiki.apache.org/cordova/IOSReleaseChecklist)
 * [AndroidReleaseChecklist](https://wiki.apache.org/cordova/AndroidReleaseChecklist)

## Moving Tags

If you need to move a tag before the release, here is how to do that:

    $ git tag -d 3.6.0
    Deleted tag '3.6.0' (was 2a9bc20)
    $ git push origin :refs/tags/3.6.0
    To https://git-wip-us.apache.org/repos/asf/cordova-docs.git
     - [deleted]         3.6.0
    $ git tag 3.6.0 7cf9fea03d7d02a13aef97a09a459e8128bd3198
    $ git push origin 3.6.0 --tags
    Total 0 (delta 0), reused 0 (delta 0)
    To https://git-wip-us.apache.org/repos/asf/cordova-docs.git
     * [new tag]         3.6.0 -> 3.6.0

Then send a note to the mailing list:

    To verify you have the updated tag in your local clone, doing a "git rev-parse 3.6.0" in cordova-docs should reply with "7cf9fea03d7d02a13aef97a09a459e8128bd3198". If it is wrong, do "git fetch --tags".

