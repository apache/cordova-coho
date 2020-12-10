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

# Release Process for 'coho'

Before cutting any releases, read the Apache's [Releases Policy](http://www.apache.org/dev/release)

If you have not done so already, create a GPG key (see: [setting-up-gpg.md](setting-up-gpg.md)).

## Decide on the next version numbers
According [versioning-and-release-strategy.md](versioning-and-release-strategy.md) patch version bumps (the last of 3 numbers) should only be used for fixes and updates of references to platform versions. For any change in functionality, the second (minor) part of the version should be bumped and new branch created. Instructions for creating a new release branch are further down on this page.

## Get Buy-in

Email the dev mailing-list and see if anyone has reason to postpone the release.

E.g.:

    Subject: [DISCUSS] Coho Release

    Does anyone have any reason to delay a Coho release?
    Any outstanding patches to land?

    If not, I will start the release tomorrow.


## Create JIRA issues

 * Create a JIRA issue to track the status of the release.
   * Make it of type "Task"
   * Title should be "Coho Release _May 10, 2017_"
   * Description should be: "Following steps at https://github.com/apache/cordova-coho/blob/master/docs/coho-release-process.md"
 * Comments should be added to this bug after each top-level step below is taken
 * Set a variable for use later on:

    JIRA="CB-????" # Set this to the release bug.

## Update and Pin Dependencies
Ensure you're up-to-date:

    coho repo-update -r coho

See if any dependencies are outdated

    (cd cordova-coho && npm outdated --depth=0)

Update them in each project's `package.json` file. Make sure to run through the test section below for compatibility issues. The `--depth=0` prevents from listing dependencies of dependencies. 

## Update Release Notes & Version

Increase the version within package.json using SemVer, and remove the `-dev` suffix

    for l in cordova-coho; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v = *-dev ]]; then v2="${v%-dev}"; echo "$l: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi) ; done

If the changes merit it, manually bump the major / minor version instead of the micro. View the changes via: 
(TODO: need to use coho to get tags for cordova-lib, fetch, common and serve. Current output is incorrect)
    
    ( cd cordova-coho; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master)

Update each repo's RELEASENOTES.md file with changes

    coho update-release-notes -r coho
    # Then curate:
    vim cordova-coho/RELEASENOTES.md

Commit these changes together into one commit

    for l in cordova-coho; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git commit -am "$JIRA Updated version and RELEASENOTES.md for release $v" ); done

## Test

Ensure license headers are present everywhere. For reference, see this [background](http://www.apache.org/legal/src-headers.html). Expect some noise in the output, for example some files from test fixtures will show up.

    coho audit-license-headers -r coho | less

Ensure all dependencies and subdependencies have Apache-compatible licenses

    coho check-license -r coho


## Tag

    # Review commits:
    for l in cordova-coho; do ( cd $l; git log -p origin/master..master ); done
    # Tag
    for l in cordova-coho; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git tag $v ); done

## Create release branches if they don't yet exist
If branches don't exist, create new ones

    (cd cordova-coho; git branch 1.0.x)
    
If branches already exist, update them

    (cd cordova-coho && git checkout 1.0.x && git merge master && git checkout master)

## Re-introduce -dev suffix to versions on master and commit

    for l in cordova-coho; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v != *-dev ]]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "$l: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi); done
    for l in cordova-coho; do (cd $l; git commit -am "$JIRA Incremented package version to -dev"; git show ); done

## Push

    for l in cordova-coho; do ( cd $l; git push && git push --tags ); done

If the push fails due to not being fully up-to-date, either:
1. Pull in new changes via `git pull --rebase`, and include them in the release notes / re-tag
2. Pull in new changes via `git pull`, and do *not* include them in the release.

If you created new release branches, push them as well e.g: `git push origin 1.0.x`

## Publish to dist/dev & npm

Ensure you have the svn repos checked out:

    coho repo-clone -r dist -r dist/dev

Create archives from your tags:

    coho create-archive -r coho --dest cordova-dist-dev/$JIRA

Sanity Check:

    coho verify-archive cordova-dist-dev/$JIRA/*.tgz

Upload:

    (cd cordova-dist-dev && svn add $JIRA && svn commit -m "$JIRA Uploading release candidate for coho release")

Find your release here: https://dist.apache.org/repos/dist/dev/cordova/

## Prepare Blog Post
 * Combine highlights from RELEASENOTES.md into a Release Announcement blog post
 * Get blog post proofread via [GitHub](http://github.com/apache/cordova-docs).

## Start VOTE Thread
Send an email to dev ML with:

__Subject:__

    [Vote] Coho Release

__Body:__

    Please review and vote on this Tools Release
    by replying to this email (and keep discussion on the DISCUSS thread)

    Release issue: https://issues.apache.org/jira/browse/CB-XXXX

    Coho has been published to dist/dev:
    https://dist.apache.org/repos/dist/dev/cordova/CB-XXXX/

    The package was published from its corresponding git tag:

    PASTE OUTPUT OF: coho print-tags -r coho

    Upon a successful vote I will upload the archives to dist/, publish them to npm, and post the corresponding blog post.

    Voting guidelines: https://github.com/apache/cordova-coho/blob/master/docs/release-voting.md

    Voting will go on for a minimum of 48 hours.

    I vote +1:
    * Ran coho audit-license-headers over the coho repo
    * Ran coho check-license to ensure all coho source has Apache-compatible licenses
    * Ensured continuous build was green when repos were tagged


## Email the result of the vote
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

## If the Vote does *not* Pass

* git checkout release branch if exists
* Address the concerns
* Bump the version number in package.json
* Create new tag based on new version number
* Cherry-pick relevant commits to master if applicable
* Start a new vote

## Otherwise: Publish to dist/

    cd cordova-dist
    svn up
    svn rm tools/cordova-coho-*
    cp ../cordova-dist-dev/$JIRA/* tools/
    svn add tools/*
    svn commit -m "$JIRA Published coho release to dist"

    cd ../cordova-dist-dev
    svn up
    svn rm $JIRA
    svn commit -m "$JIRA Removing release candidates from dist/dev"
    cd ..

Find your release here: https://dist.apache.org/repos/dist/release/cordova/tools

## Publish and test from npm

Publish these to npm

    npm publish cordova-dist/tools/cordova-coho-*.tgz

Test from npm:

    npm -g uninstall cordova-coho
    npm -g install cordova-coho@latest
    mkdir test
    cd test
    coho repo-clone -g -r tools

### Tell Apache about Release

TODO: Please someone write a coho helper for doing this POST request!

1. Go to: https://reporter.apache.org/addrelease.html?cordova
2. Use version "cordova-coho@x.x.x"

## Post Blog Post

Follow https://github.com/apache/cordova-docs#deploying

## Email a release announcement to the mailing list
Subject: [ANNOUNCEMENT] Coho Release

    Cordova-coho@VERSION has been released!

    You can view the release blog post at LINK_TO_BLOG

## Make permanent release tags

Make a copy of your released tag with a prefix of rel\YOURTAG. These are permanent release tags for Apache.
Do this for all of the tools you just released. For example:

    (cd cordova-coho; git checkout 1.0.0; git tag rel/1.0.0; git push origin --tags; git checkout master)

## Do other announcements

Tweet out blog post and post to #releases in slack

## Update dependencies going forward

    git checkout master
    npm outdated --depth 0

If there are any dependencies or devDependencies that are out of date, open a Jira item for that tool.

## Close JIRA Issue
 * Double check that the issue has comments that record the steps you took
 * Mark it as fixed

## Finally:

 * Update *these instructions* if they were missing anything.

