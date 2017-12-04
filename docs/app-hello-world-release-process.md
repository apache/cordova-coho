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

# Release Process for ''Cordova-App-Hello-World''

Before cutting any releases, read the Apache's [Releases Policy](http://www.apache.org/dev/release)

This page describes the technical steps for releasing the `Hello-world-app` (see: [versioning-and-release-strategy.md](versioning-and-release-strategy.md)).

## Get Buy-in

Email the dev mailing-list at dev@cordova.apache.org and see if anyone has reason to postpone the release.

E.g.:

    Subject: [DISCUSS] Cordova App Hello World Release

    Does anyone have any reason to delay a cordova-app-hello-world release?
    Any outstanding patches to land?

    If not, I will start the release tomorrow.

## Creating JIRA issues

 * Create a JIRA issue to track the status of the release.
   * Make it of type "Task"
   * Title should be "Cordova-App-Hello-World Release _March 09, 2015_"
   * Description should be: "Following steps at https://github.com/apache/cordova-coho/blob/master/docs/cordova-app-hello-world-release-process.md"
 * Comments should be added to this bug after each top-level step below is taken
 * Set a variable in your terminal for use later on:


    JIRA="CB-????" # Set this to the release bug.

## Update Release Notes & Version

Increment the version within `package.json` using `SemVer`, and remove the `-dev` suffix.

    (cd cordova-app-hello-world; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v = *-dev ]]; then v2="${v%-dev}"; echo "cordova-app-hello-world: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi)
     
If the changes merit it, manually bump the major / minor version instead of the micro. List the changes via:

    (cd cordova-app-hello-world; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master)

Update Release notes (Grab changes from the previous release until now):

    coho update-release-notes -r app-hello-world
    
    # Then curate:
    vim cordova-app-hello-world/RELEASENOTES.md 
 
Commit these changes

    (cd cordova-app-hello-world; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git commit -am "$JIRA Updated version and RELEASENOTES.md for release $v")
    (cd cordova-app-hello-world; git push origin master)

Reply to the DISCUSS thread with a link to the updated release notes.

## Test

Link repos:

    (cd cordova-app-hello-world && npm link)
    (cd cordova-lib/cordova-lib/node_modules && npm link cordova-app-hello-world)
    (cd cordova-lib/cordova-lib && npm link)

Ensure License headers are present everywhere.

    coho audit-license-headers -r app-hello-world | less

Ensure building a cordova app from scratch uses the new template. Manually check files in generated www.

    cordova create helloWorld

Add a comment to the JIRA issue stating what you tested, and what the results were.

## Tag

    # Review commits:
    (cd cordova-app-hello-world; git log -p origin/master..master)
    # Tag
    (cd cordova-app-hello-world; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git tag $v )

## Create Release Branches

Note: if you are only bumping the patch version (3rd number), use existing branch. 

    (cd cordova-app-hello-world; git branch 3.8.x)

## Re-introduce -dev suffix to versions on master

    (cd cordova-app-hello-world; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v != *-dev ]]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "cordova-app-hello-world: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi)
    (cd cordova-app-hello-world; git commit -am "$JIRA Incremented package version to -dev"; git show)

## Push

    (cd cordova-app-hello-world; git push && git push --tags)

If the push fails due to not being fully up-to-date, either:
1. Pull in new changes via `git pull --rebase`, and include them in the release notes / re-tag
2. Pull in new changes via `git pull`, and do *not* include them in the release.

If you created new release branches, push them as well

    (cd cordova-app-hello-world; git push origin 3.8.x)

## Publish to dist/dev

Ensure you have the svn repos checked out:

    coho repo-clone -r dist -r dist/dev
    
Create archives from your tags:

    coho create-archive -r app-hello-world --dest cordova-dist-dev/$JIRA

Sanity Check:

    coho verify-archive cordova-dist-dev/$JIRA/*.tgz

Upload: 

    (cd cordova-dist-dev && svn add $JIRA && svn commit -m "$JIRA Uploading release candidate for cordova-app-hello-world")

Find your release here: https://dist.apache.org/repos/dist/dev/cordova/

## Start VOTE Thread
Send an email to dev mailing list with: 

__Subject:__

    [Vote] 3.8.0 Cordova App Hello World Release

__Body:__

    Please review and vote on this 3.8.0 Cordova App Hello World Release
    by replying to this email (and keep discussion on the DISCUSS thread)

    Release issue: https://issues.apache.org/jira/browse/CB-XXXX

    Repos ready to be released have been published to dist/dev:
    https://dist.apache.org/repos/dist/dev/cordova/CB-XXXX

    The package was published from its corresponding git tag:
    PASTE OUTPUT OF: coho print-tags -r app-hello-world
 
    Upon a successful vote I will upload the archive to dist/ and publish it to NPM.

    Voting guidelines: https://github.com/apache/cordova-coho/blob/master/docs/release-voting.md

    Voting will go on for a minimum of 48 hours.

    I vote +1:
    * Ran coho audit-license-headers over the relevant repos
    * Ran coho check-license to ensure all dependencies and subdependencies have Apache-compatible licenses
    * Built a hello world app using the CLI

## Email the result of the vote
Respond to the vote thread with:

    The vote has now closed. The results are:

    Positive Binding Votes: (# of PMC members that +1'ed)

    .. names of all +1 PMC members ..

    Negative Binding Votes: (# of PMC members that -1'ed)

    .. names of all -1 PMC members ..

    The vote has passed.

_Note: list of PMC members: http://people.apache.org/phonebook.html?pmc=cordova_

## If the Vote does *not* Pass
* Revert adding of `-dev`
* Address the concerns
* Re-tag release using `git tag -f`
* Add back `-dev`
* Start a new vote

## Otherwise: Publish to dist/ & npm

    cd cordova-dist
    svn up
    svn rm templates/cordova-app-hello-world*
    cp ../cordova-dist-dev/$JIRA/cordova-app-hello-world* templates/
    svn add templates/cordova-app-hello-world*
    svn commit -m "$JIRA Published cordova-app-hello-world release to dist"
    npm publish templates/cordova-app-hello-world.3.8.0.tgz

    cd ../cordova-dist-dev
    svn up
    svn rm $JIRA
    svn commit -m "$JIRA Removing release candidates from dist/dev"
    cd ..


Find your release here: https://dist.apache.org/repos/dist/release/cordova/

## Important follow up steps

### Tell Apache about Release

1. Go to: https://reporter.apache.org/addrelease.html?cordova
2. Use version "cordova-app-hello-world@x.x.x"

### Update cordova-app-hello-world version that cordova-lib depends on

    v="$(grep '"version"' cordova-app-hello-world/package.json | cut -d'"' -f4)"
    sed -i '' -E 's/"cordova-app-hello-world":.*/"cordova-app-hello-world": "'$v'",/' cordova-lib/cordova-lib/package.json

### Update hello world template each platform ships with. This is so users can create projects without the CLI.

    (cp -fr cordova-app-hello-world/www/* cordova-android/bin/templates/project/assets/www/)
    (cd cordova-android && git commit -am "$JIRA updated hello-world template")
    
    (cp -fr cordova-app-hello-world/www/* cordova-ios/bin/templates/project/www/)
    (cd cordova-ios && git commit -am "$JIRA updated hello-world template")
    
    (cp -fr cordova-app-hello-world/www/* cordova-windows/template/www/)
    (cd cordova-windows && git commit -am "$JIRA updated hello-world template")

TODO: Need to add other platforms path to templates here

## Email a release announcement to the mailing list
Subject: [ANNOUNCEMENT] Cordova App Hello World Release

    Cordova-app-hello-world@VERSION has been released!

## Do other announcements

    Do the same things regarding announcements as described in cadence-release-process, where they make sense.

## Close JIRA Issue
 * Double check that the issue includes comments that record the steps you took
 * Mark it as fixed

## Finally:

 * Update *these instructions* if they were missing anything.
