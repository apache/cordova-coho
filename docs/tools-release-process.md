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

# Release Process for ''Plugman and CLI and Cordova-lib''

Before cutting any releases, read the Apache's [Releases Policy](http://www.apache.org/dev/release)

If you have not done so already, create a GPG key (see: [setting-up-gpg.md](setting-up-gpg.md)).

Plugman and CLI are released at most weekly (see: [versioning-and-release-strategy.md](versioning-and-release-strategy.md)).

A tools release is performed by a single person each week. We call this person the "Release Manager". How to select the Release Manager is still TDB.

TODO: Use perl instead of sed in these commands so they work on Linux.

## Get Buy-in

Email the dev mailing-list and see if anyone has reason to postpone the release.

E.g.:

    Subject: [DISCUSS] Tools Release

    Does anyone have any reason to delay a tools release?
    Any outstanding patches to land?

    If not, I will start the release tomorrow.


## Create JIRA issues

 * Create a JIRA issue to track the status of the release.
   * Make it of type "Task"
   * Title should be "Tools Release _Feb 2, 2014_"
   * Description should be: "Following steps at https://github.com/apache/cordova-coho/blob/master/docs/tools-release-process.md"
 * Comments should be added to this bug after each top-level step below is taken
 * Set a variable for use later on:


    JIRA="CB-????" # Set this to the release bug.

## Test
Ensure you're up-to-date:

    coho repo-update -r tools
    (cd cordova-lib/cordova-lib && npm install)
    (cd cordova-plugman && npm install)
    (cd cordova-cli && npm install)

Ensure license headers are present everywhere:

    coho audit-license-headers -r cli | less
    coho audit-license-headers -r plugman | less
    coho audit-license-headers -r lib | less

Ensure that mobilespec creates okay via CLI:

    cordova-mobile-spec/createmobilespec/createmobilespec.js --android --ios
    (cd mobilespec && cordova build && cordova run android)

Ensure uninstall doesn't cause errors:

    cordova plugin remove org.cordova.mobile-spec-dependencies

Ensure that mobilespec creates okay via plugman:

    cordova-mobile-spec/createmobilespec/createmobilespec.js --plugman --android
    (cd mobilespec-android && cordova/run)

Ensure unit tests pass:

    (cd cordova-plugman; npm test)
    (cd cordova-cli; npm test)
    (cd cordova-lib/cordova-lib; npm test)

Add a comment to the JIRA issue stating what you tested, and what the results were.

## Update Release Notes & Version

Increase the version within package.json using SemVer, and remove the ''-dev'' suffix

    for l in cordova-lib/cordova-lib cordova-plugman cordova-cli; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v = *-dev ]]; then v2="${v%-dev}"; echo "$l: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi) ; done

If the changes merit it, manually bump the major / minor version instead of the micro. List the changes via:

    ( cd cordova-lib/cordova-lib; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master | grep -v "Incremented plugin version" )


    ( cd cordova-plugman; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master | grep -v "Incremented plugin version" )


    ( cd cordova-cli; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master | grep -v "Incremented plugin version" )


Update each repo's RELEASENOTES.md file with changes

    # Add new heading to release notes with version and date
    DATE=$(date "+%h %d, %Y")
    for l in cordova-lib/cordova-lib cordova-plugman cordova-cli; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; echo -e "\n### $v ($DATE)" >> RELEASENOTES.md; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master | grep -v "Incremented plugin version" >> RELEASENOTES.md); done
    # Then curate: (note that the newest notes are at the bottom of the file and should be manually moved to the top)
    vim cordova-lib/cordova-lib/RELEASENOTES.md cordova-cli/RELEASENOTES.md cordova-plugman/RELEASENOTES.md

Update the version of cordova-lib that cli and plugman depend on:

    v="$(grep '"version"' cordova-lib/cordova-lib/package.json | cut -d'"' -f4)"
    sed -i '' -E 's/"cordova-lib":.*/"cordova-lib": "'$v'",/' cordova-cli/package.json
    sed -i '' -E 's/"cordova.lib":.*/"cordova-lib": "'$v'",/' cordova-plugman/package.json

Update the version of cordova-js that cordova-lib depends on. (TODO: why does this dependency exist?)

Before creating the shrinkwrap, do the following so that the shrinkwrap will have the correct content.

 * If you have used "npm link ..." across cordova dependencies, remove that. If you don't, then the devDependencies of the child module will be included in the dependent's shrinkwrap since the shrinkwrap process walks the node_modules directory tree instead of inspecting the package.json file of each dependency. Using npm link is great for development time, bad for packaging time. This should be taken care of in the `rm -r node_modules` step below.
 * Clear the npm cache. If you don't then the `from` and `resolved` fields in the shrinkwrap may not be generated properly.
    npm cache clear
 * For each cordova module that you want to shrinkwrap, do a clean install of its dependencies. (TODO: at this point it appears I would first need to "npm publish cordova-js" before I could do a clean install of the cordova-lib dependencies and create the shrinkwrap for cordova-lib. And then the same to "npm publish cordova-lib" before I could do a clean install of the cordova-cli/cordova-plugman dependencies and create the shrinkwrap for cordova-cli and cordova-plugman).
    rm -r node_modules
    npm install

Create npm-shrinkwrap.json in lib, cli, and plugman. This is important especially when the cli depends on specific versions of lib and similar, because the shrinkwrap overrules the version dependencies in package.json. If the tools have any specific version dependencies, verify they are correct in the shrinkwrap after you complete this step.

    (cd cordova-lib/cordova-lib; npm shrinkwrap;)
    (cd cordova-cli; npm shrinkwrap;)
    (cd cordova-plugman; npm shrinkwrap;)

Commit these three changes together into one commit

    for l in cordova-lib/cordova-lib cordova-plugman cordova-cli; do ( cd $l; git add npm-shrinkwrap.json; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git commit -am "$JIRA Updated version and RELEASENOTES.md for release $v" ); done

## Tag

    # Review commits:
    for l in cordova-plugman cordova-cli cordova-lib; do ( cd $l; git log -p origin/master..master ); done
    # Tag
    for l in cordova-plugman cordova-cli cordova-lib/cordova-lib; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git tag $v ); done

## Re-introduce -dev suffix to versions and remove shrinkwrap

    (cd cordova-lib/cordova-lib; git rm npm-shrinkwrap.json;)
    (cd cordova-cli; git rm npm-shrinkwrap.json;)
    (cd cordova-plugman; git rm npm-shrinkwrap.json;)

    for l in cordova-lib/cordova-lib cordova-plugman cordova-cli; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v != *-dev ]]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "$l: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi); done
    for l in cordova-lib/cordova-lib cordova-plugman cordova-cli; do (cd $l; git commit -am "$JIRA Incremented package version to -dev"; git show ); done


## Push

    # Push
    for l in cordova-lib cordova-plugman cordova-cli; do ( cd $l; git push && git push --tags ); done

If the push fails due to not being fully up-to-date, either:
1. Pull in new changes via `git pull --rebase`, and include them in the release notes / re-tag
2. Pull in new changes via `git pull`, and do *not* include them in the release.

## Publish to dist/dev
Ensure you have the svn repos checked out:

    coho repo-clone -r dist -r dist/dev

Create archives from your tags:

    coho create-archive -r lib --dest cordova-dist-dev/$JIRA --tag 0.21.10
    coho create-archive -r plugman --dest cordova-dist-dev/$JIRA --tag 0.22.7
    coho create-archive -r cli --dest cordova-dist-dev/$JIRA --tag 3.6.1-0.2.10

Sanity Check:

    coho verify-archive cordova-dist-dev/$JIRA/*.tgz

Upload:

    (cd cordova-dist-dev && svn add $JIRA && svn commit -m "$JIRA Uploading release candidates for tools release")

Find your release here: https://dist.apache.org/repos/dist/dev/cordova/


## Prepare Blog Post
 * Combine highlights from RELEASENOTES.md into a Release Announcement blog post
   * Instructions on [sites page README](https://svn.apache.org/repos/asf/cordova/site/README.md)
 * Get blog post proofread via [piratepad](http://piratepad.net/front-page/).

## Start VOTE Thread
Send an email to dev ML with:

__Subject:__

    [Vote] Tools Release

__Body:__

    Please review and vote on this Tools Release.

    Release issue: https://issues.apache.org/jira/browse/CB-XXXX

    Both tools have been published to dist/dev:
    https://dist.apache.org/repos/dist/dev/cordova/CB-XXXX/

    The packages were published from their corresponding git tags:
    PASTE OUTPUT OF: coho print-tags -r lib -r cli -r plugman

    Upon a successful vote I will upload the archives to dist/, publish them to NPM, and post the corresponding blog post.

    Voting guidelines: https://github.com/apache/cordova-coho/blob/master/docs/release-voting.md

    Voting will go on for a minimum of 48 hours.

    I vote +1:
    * Ran coho audit-license-headers over the relevant repos
    * Used `license-checker` to ensure all dependencies have Apache-compatible licenses
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

## Otherwise: Publish to dist/

    cd cordova-dist
    svn up
    svn rm tools/*
    cp ../cordova-dist-dev/$JIRA/* tools/
    svn add tools/*
    svn commit -m "$JIRA Published tools release to dist"

    cd ../cordova-dist-dev
    svn up
    svn rm $JIRA
    svn commit -m "$JIRA Removing release candidates from dist/dev"
    cd ..


Find your release here: https://dist.apache.org/repos/dist/release/cordova/tools

## Publish to NPM

    npm publish cordova-dist/tools/cordova-lib-*.tgz
    npm publish cordova-dist/tools/cordova-cli-*.tgz
    npm publish cordova-dist/tools/cordova-plugman-*.tgz


If npm publish fails for you, run `npm owner ls PACKAGENAME` to see if you are an owner. If you aren't, ask one of the owners to add you.

If you have already published the package under the `rc` tag, then you will have to run `npm tag cordova@version latest`


## Post Blog Post

    cd cordova-website
    rake build
    svn st
    svn add blah.blah.blah
    svn commit -m "$JIRA Published blog post for tools release."

## Email a release announcement to the mailing list
Subject: [ANNOUNCEMENT] Tools Release

    Cordova-cli@VERSION & Plugman@VERSION has been released!

    You can view the release blog post at LINK_TO_BLOG

## Do other announcements

    Do the same things regarding announcements as described in cadence-release-process, where they make sense.

## Close JIRA Issue
 * Double check that the issue has comments that record the steps you took
 * Mark it as fixed

## Finally:

 * Update *these instructions* if they were missing anything.

