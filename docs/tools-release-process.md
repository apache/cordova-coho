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

# Release Process for ''Plugman, CLI, Cordova-lib, and Cordova-js''

Before cutting any releases, read the Apache's [Releases Policy](http://www.apache.org/dev/release)

If you have not done so already, create a GPG key (see: [setting-up-gpg.md](setting-up-gpg.md)).

Plugman and CLI are released at most weekly (see: [versioning-and-release-strategy.md](versioning-and-release-strategy.md)).

A tools release is performed by a single person each week. We call this person the "Release Manager". How to select the Release Manager is still TDB.

## Decide on the next version numbers
According [versioning-and-release-strategy.md](versioning-and-release-strategy.md) patch version bumps (the last of 3 numbers) should only be used for fixes and updates of references to platform versions. For any change in functionality, the second (minor) part of the version should be bumped and new branch created. Instructions for creating a new release branch are further down on this page.

## Get Buy-in

Email the dev mailing-list and see if anyone has reason to postpone the release.

E.g.:

    Subject: [DISCUSS] Tools Release

    Does anyone have any reason to delay a tools release?
    Any outstanding patches to land?

    If not, I will start the release tomorrow.

    The versions to be released are:
     - lib@x.y.z
     - cli@
     - plugman@
     - cordova-js@


## Create JIRA issues

 * Create a JIRA issue to track the status of the release.
   * Make it of type "Task"
   * Title should be "Tools Release _Feb 2, 2014_"
   * Description should be: "Following steps at https://github.com/apache/cordova-coho/blob/master/docs/tools-release-process.md"
 * Comments should be added to this bug after each top-level step below is taken
 * Set a variable for use later on:

    JIRA="CB-????" # Set this to the release bug.

## Update and Pin Dependencies
Ensure you're up-to-date:

    coho repo-update -r tools

See if any dependencies are outdated

    (cd cordova-js && npm outdated --depth=0)
    (cd cordova-lib/cordova-lib && npm outdated --depth=0)
    (cd cordova-plugman && npm outdated --depth=0)
    (cd cordova-cli && npm outdated --depth=0)

Update them in each project's `package.json` file. Make sure to run through the test section below for compatability issues. The `--depth=0` prevents from listing dependencies of dependencies. As of this writing, the following packages are behind and are not safe to upgrade:
 * nopt for plugman - see [CB-7915](https://issues.apache.org/jira/browse/CB-7915)
 * elementtree - elementtree@0.1.6 breaks tests in cordova-lib, investigation needed.

## Update Release Notes & Version

Increase the version within package.json using SemVer, and remove the ''-dev'' suffix

    for l in cordova-lib/cordova-lib cordova-plugman cordova-cli cordova-js; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v = *-dev ]]; then v2="${v%-dev}"; echo "$l: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi) ; done

If the changes merit it, manually bump the major / minor version instead of the micro. View the changes via:

    ( cd cordova-lib/cordova-lib; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master )

    ( cd cordova-plugman; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master)

    ( cd cordova-cli; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master)

    ( cd cordova-js; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master)

Update each repo's RELEASENOTES.md file with changes

    coho update-release-notes -r cordova-lib -r cordova-js -r cordova-plugman -r cordova-cli
    # Then curate:
    vim cordova-lib/cordova-lib/RELEASENOTES.md cordova-cli/RELEASENOTES.md cordova-plugman/RELEASENOTES.md cordova-js/RELEASENOTES.md

Update the version of cordova-lib that cli and plugman depend on:

    v="$(grep '"version"' cordova-lib/cordova-lib/package.json | cut -d'"' -f4)"
    sed -i '' -E 's/"cordova-lib":.*/"cordova-lib": "'$v'",/' cordova-cli/package.json
    sed -i '' -E 's/"cordova.lib":.*/"cordova-lib": "'$v'",/' cordova-plugman/package.json

Update the version of cordova-js that cordova-lib depends on:

    v="$(grep '"version"' cordova-js/package.json | cut -d'"' -f4)"
    sed -i '' -E 's/"cordova-js":.*/"cordova-js": "'$v'",/' cordova-lib/cordova-lib/package.json

Manually update the platform dev dependencies in `package.json` for cordova-js

Commit these changes together into one commit

    for l in cordova-plugman cordova-cli cordova-js cordova-lib/cordova-lib; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git commit -am "$JIRA Updated version and RELEASENOTES.md for release $v" ); done

Reply to the DISCUSS thread with a link to the updated release notes.

## Test
Link repos:

    (cd cordova-js && npm link)
    (cd cordova-lib/cordova-lib && rm -r node_modules && npm link cordova-js && npm install && npm link)
    (cd cordova-plugman && rm -r node_modules && npm link cordova-lib && npm install)
    (cd cordova-cli && rm -r node_modules && npm link cordova-lib && npm install)

Ensure license headers are present everywhere. For reference, see this [background](http://www.apache.org/legal/src-headers.html). Expect some noise in the output, for example some files from test fixtures will show up.

    coho audit-license-headers -r js | less
    coho audit-license-headers -r cli | less
    coho audit-license-headers -r plugman | less
    coho audit-license-headers -r lib | less

Ensure all dependencies and subdependencies have Apache-compatible licenses

    coho check-license -r tools

Ensure that mobilespec creates okay via CLI:

    cordova-mobile-spec/createmobilespec/createmobilespec.js --android --ios
    (cd mobilespec && ./cordova build && ./cordova run android)

Ensure uninstall doesn't cause errors:

    (cd mobilespec && ./cordova plugin remove org.cordova.mobile-spec-dependencies)

Ensure that mobilespec creates okay via plugman:

    cordova-mobile-spec/createmobilespec/createmobilespec.js --plugman --android
    (cd mobilespec-android && cordova/run)

Ensure unit tests pass (plugman tests are included in lib):

    (cd cordova-lib/cordova-lib; npm test)
    (cd cordova-cli; npm test)
    (cd cordova-js; grunt test --platformVersion=3.7.0)

Add a comment to the JIRA issue stating what you tested, and what the results were.


## Tag

    # Review commits:
    for l in cordova-plugman cordova-cli cordova-lib cordova-js; do ( cd $l; git log -p origin/master..master ); done
    # Tag
    for l in cordova-plugman cordova-cli cordova-lib/cordova-lib cordova-js; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git tag $v ); done

## Create release branches if they don't yet exist
Note, if you are only bumping the patch version (3rd number), use existing branch. See: [versioning-and-release-strategy.md](versioning-and-release-strategy.md).

    (cd cordova-cli; git branch 4.2.x)
    (cd cordova-lib; git branch 4.2.x)
    (cd cordova-js; git branch 3.8.x)
    (cd cordova-plugman; git branch 0.23.x)

## Re-introduce -dev suffix to versions on master

    for l in cordova-lib/cordova-lib cordova-plugman cordova-cli cordova-js; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v != *-dev ]]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "$l: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi); done
    for l in cordova-lib/cordova-lib cordova-plugman cordova-cli cordova-js; do (cd $l; git commit -am "$JIRA Incremented package version to -dev"; git show ); done

## Push

    for l in cordova-lib cordova-plugman cordova-cli cordova-js; do ( cd $l; git push && git push --tags ); done

If the push fails due to not being fully up-to-date, either:
1. Pull in new changes via `git pull --rebase`, and include them in the release notes / re-tag
2. Pull in new changes via `git pull`, and do *not* include them in the release.

If you created new release branches, push them as well e.g: `git push origin 4.2.x`

## Publish to dist/dev & npm
Ensure you have the svn repos checked out:

    coho repo-clone -r dist -r dist/dev

Create archives from your tags:

    coho create-archive -r plugman -r cli -r lib -r js --dest cordova-dist-dev/$JIRA

Sanity Check:

    coho verify-archive cordova-dist-dev/$JIRA/*.tgz

Upload:

    (cd cordova-dist-dev && svn add $JIRA && svn commit -m "$JIRA Uploading release candidates for tools release")

Find your release here: https://dist.apache.org/repos/dist/dev/cordova/


Next, publish these to npm, and be sure to use the "rc" tag in npm.

    npm publish --tag rc cordova-dist-dev/$JIRA/cordova-js-*.tgz
    npm publish --tag rc cordova-dist-dev/$JIRA/cordova-lib-*.tgz
    npm publish --tag rc cordova-dist-dev/$JIRA/cordova-5.*.tgz
    npm publish --tag rc cordova-dist-dev/$JIRA/plugman-*.tgz

## Test from NPM

    npm -g uninstall cordova
    npm -g install cordova@rc
    cordova create mytest
    cd mytest
    cordova platform add android
    cordova plugin add org.apache.cordova.device
    cordova build

## Prepare Blog Post
 * Combine highlights from RELEASENOTES.md into a Release Announcement blog post
   * Instructions on [sites page README](https://svn.apache.org/repos/asf/cordova/site/README.md)
 * Get blog post proofread via [GitHub](http://github.com/cordova/apache-blog-posts).

## Start VOTE Thread
Send an email to dev ML with:

__Subject:__

    [Vote] Tools Release

__Body:__

    Please review and vote on this Tools Release
    by replying to this email (and keep discussion on the DISCUSS thread)

    Release issue: https://issues.apache.org/jira/browse/CB-XXXX

    Both tools have been published to dist/dev:
    https://dist.apache.org/repos/dist/dev/cordova/CB-XXXX/

    The packages were published from their corresponding git tags:

    PASTE OUTPUT OF: coho print-tags -r js -r lib -r plugman -r cli

    Upon a successful vote I will upload the archives to dist/, publish them to NPM, and post the corresponding blog post.

    Voting guidelines: https://github.com/apache/cordova-coho/blob/master/docs/release-voting.md

    Voting will go on for a minimum of 48 hours.

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

* git checkout release branch if exists
* Address the concerns
* Bump the version number in package.json
* Create new tag based on new version number
* Cherry-pick relevant commits to master if applicable
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

### Tell Apache about Release

TODO: Please someone write a coho helper for doing this POST request!

1. Go to: https://reporter.apache.org/addrelease.py
2. Use version "cordova-$FOO@x.x.x"

## Promote to `latest` in NPM

    cd cordova-dist/tools
    npm dist-tag add cordova-js@VERSION latest
    npm dist-tag add cordova-lib@VERSION latest
    npm dist-tag add plugman@VERSION latest
    npm dist-tag add cordova@VERSION latest

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

## Update dependencies going forward

For each of the tools (including cordova-js):

    git checkout master
    npm outdated --depth 0

If there are any dependencies or devDependencies that are out of date, open a Jira item for that tool.

## Close JIRA Issue
 * Double check that the issue has comments that record the steps you took
 * Mark it as fixed

## Finally:

 * Update *these instructions* if they were missing anything.

## Outdated Shrinkwrap

These instructions are being kept here inscase we decide to start using shrinkwrap again.

Before creating the shrinkwrap on the cli, do the following so that the shrinkwrap will have the correct content:

Publish any dependent modules (cordova-lib, cordova-js) to npm before creating a shrinkwrap of the parent (cordova-cli). This enables the "from" field in the shrinkwrap to have the correct URL. And it prevents any of the submodule's devDependenies from appearing in a parent's shrinkwrap. If you have already packaged and published cordova-js, then you can omit that from the rest of the steps in this bullet level. Here are the steps to do that:

First, commit everything in the dependent modules, tag, and push.

    # Commit:
    for l in cordova-lib/cordova-lib cordova-js; do ( cd $l; git add .; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git commit -am "$JIRA Updated version and RELEASENOTES.md for release $v" ); done
    # Review commits:
    for l in cordova-lib cordova-js; do ( cd $l; git log -p origin/master..master ); done
    # Tag
    for l in cordova-lib/cordova-lib cordova-js; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git tag $v ); done
    # Push
    for l in cordova-lib cordova-js; do ( cd $l; git push && git push --tags ); done

Create an npm pack archive of the dependencies

    coho create-archive -r js --dest cordova-dist-dev/$JIRA --tag 3.6.3
    coho create-archive -r lib --dest cordova-dist-dev/$JIRA --tag 0.21.13

You may want to check out the master branch of these again, as the `create-archive` command will leave them in a detached-head state at the desired tag

    coho foreach -r js -r lib "git checkout master"

Verify the archives

    coho verify-archive cordova-dist-dev/$JIRA/cordova-js-*.tgz
    coho verify-archive cordova-dist-dev/$JIRA/cordova-lib-*.tgz

Next, publish these to npm, and be sure to use the "rc" tag in npm.

    npm publish --tag rc cordova-dist-dev/$JIRA/cordova-js-*.tgz
    npm publish --tag rc cordova-dist-dev/$JIRA/cordova-lib-*.tgz

Clear the npm cache. If you don't then the `from` and `resolved` fields in the shrinkwrap may not be generated properly.

    npm cache clear

Do a fresh install of the dependencies in cordova-lib, cordova-plugman, and cordova-cli, so that the `npm link` entries are gone, and cli installs lib and js from the npm instead of locally. This is so the "from" field appears correctly in the shrinkwrap. And so that none of the devDependencies are included from a dependent module (since the shrinkwrap process walks the node_modules directory tree instead of inspecting the package.json file of each dependency. Using npm link is great for development time, bad for packaging time).

    (cd cordova-lib && rm -r node_modules && npm install)
    (cd cordova-plugman && rm -r node_modules && npm install)
    (cd cordova-cli && rm -r node_modules && npm install)

Create npm-shrinkwrap.json in the cli. This is important especially when the cli depends on specific versions of lib and similar, because the shrinkwrap overrules the version dependencies in package.json. If the tools have any specific version dependencies, verify they are correct in the shrinkwrap after you complete this step.

    (cd cordova-cli; npm shrinkwrap)

