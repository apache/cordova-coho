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

# Release Process for ''Plugman, CLI, Cordova-lib, Cordova-js, cordova-fetch, cordova-common, cordova-serve, cordova-create''

Before cutting any releases, read the Apache's [Releases Policy](http://www.apache.org/dev/release)

If you have not done so already, create a GPG key (see: [setting-up-gpg.md](setting-up-gpg.md)).

Plugman and CLI are released at most weekly (see: [versioning-and-release-strategy.md](versioning-and-release-strategy.md)).

A tools release is performed by a single person each week. We call this person the "Release Manager". How to select the Release Manager is still TDB.

## Decide on the next version numbers
According [versioning-and-release-strategy.md](versioning-and-release-strategy.md) patch version bumps (the last of 3 numbers) should only be used for fixes and updates of references to platform versions. For any change in functionality, the second (minor) part of the version should be bumped and new branch created. Instructions for creating a new release branch are further down on this page.

## Tools release planning

### cordova-common singleton rule

The most important rule is that packages such as `cordova-lib` and `cordova-cli` should not use multiple versions of `cordova-common` through the chain of dependencies. This rule is due to the use of multiple singletons in `cordova-common`. This means that if `cordova-common` is updated it should be released before other packages such as `cordova-fetch`, `cordova-create`, `cordova-lib`, `cordova-cli`, etc.

### Alternative approaches

This document describes how to release all tools packages at once but this is not the only possible approach. The following alternative approaches are also possible:

 * release a single tools package
 * release multiple tools packages in sequence, as needed to satisfy 

### Dependency graph

*Draft* dependency graph by [@raphinesse (Raphael von der Grün)](https://github.com/raphinesse) (see [apache/cordova-discuss#101 issuecomment-402857794](https://github.com/apache/cordova-discuss/issues/101#issuecomment-402857794)):

![Cordova tooling dependency graph](https://user-images.githubusercontent.com/1006620/42348357-7a70c496-80a9-11e8-9ec9-2ad4ce6db1b3.png "Cordova tooling dependency graph")

(with `cordova-common` -> `cordova-registry-mapper` removed from `master` branch of `cordova-common`)

NOTE: Whenever we start a new major release it is possible that the `master` branch of Cordova packages will have explicit dependency on previous patch release of other packages.

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
     - common@
     - fetch@
     - serve@
     - create@
     - node-xcode@


## Create JIRA issues

 * Create a JIRA issue to track the status of the release.
   * Make it of type "Task"
   * Title should be "Tools Release _Feb 2, 2014_"
   * Description should be: "Following steps at https://github.com/apache/cordova-coho/blob/master/docs/tools-release-process.md"
 * Comments should be added to this bug after each top-level step below is taken
 * Set a variable for use later on:

    Copy and paste the following in your terminal to create a JIRA variable which we can later use to reference the issue number: JIRA="CB-?????"

    Make sure to replace CB-????? with the real release issue number.

    Confirm the variable is set by typing echo $JIRA.

## Update and Pin Dependencies
Ensure you're up-to-date:

    coho repo-update -r tools

See if any dependencies are outdated

    (cd cordova-js && npm outdated --depth=0)
    (cd cordova-lib && npm outdated --depth=0)
    (cd cordova-fetch && npm outdated --depth=0)
    (cd cordova-common && npm outdated --depth=0)
    (cd cordova-serve && npm outdated --depth=0)
    (cd cordova-plugman && npm outdated --depth=0)
    (cd cordova-cli && npm outdated --depth=0)
    (cd cordova-create && npm outdated --depth=0)
    (cd cordova-node-xcode && npm outdated --depth=0)

Update them in each project's `package.json` file. Make sure to run through the test section below for compatibility issues. The `--depth=0` prevents from listing dependencies of dependencies. As of this writing, the following packages are behind and are not safe to upgrade:
 * nopt for plugman - see [CB-7915](https://issues.apache.org/jira/browse/CB-7915)
 * elementtree - elementtree@0.1.6 breaks tests in cordova-lib, investigation needed.

## Update pinned platforms

Make sure pinned platforms are up to date in https://github.com/apache/cordova-lib/blob/master/src/platforms/platformsConfig.json, if not, update them

## Update Release Notes & Version

Increase the version within package.json using SemVer, and remove the `-dev` suffix

    for l in cordova-lib cordova-plugman cordova-cli cordova-js cordova-common cordova-fetch cordova-serve cordova-create cordova-node-xcode; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v = *-dev ]]; then v2="${v%-dev}"; echo "$l: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi) ; done

If the changes merit it, manually bump the major / minor version instead of the micro. View the changes via: 
(TODO: need to use coho to get tags for cordova-lib, fetch, common and serve. Current output is incorrect)

    ( cd cordova-lib; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master )

    ( cd cordova-plugman; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master)

    ( cd cordova-cli; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master)

    ( cd cordova-js; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master)
    
    ( cd cordova-common; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master )
    
    ( cd cordova-fetch; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master )
    
    ( cd cordova-serve; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master )
    
    ( cd cordova-create; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master)

    ( cd cordova-node-xcode; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master)

Update each repo's RELEASENOTES.md file with changes

    coho update-release-notes -r cordova-lib -r cordova-js -r cordova-plugman -r cordova-cli -r common -r fetch -r serve -r create -r node-xcode

(individual `coho update-release-notes` commands with `--from-tag` and/or `--to-tag` may be needed in case of non-master branch)

Then curate:

    vim cordova-lib/RELEASENOTES.md cordova-cli/RELEASENOTES.md cordova-plugman/RELEASENOTES.md cordova-js/RELEASENOTES.md cordova-common/RELEASENOTES.md cordova-fetch/RELEASENOTES.md cordova-serve/RELEASENOTES.md cordova-create/RELEASENOTES.md cordova-node-xcode/RELEASENOTES.md

Update the version of cordova-lib that cli and plugman depend on:

    v="$(grep '"version"' cordova-lib/package.json | cut -d'"' -f4)"
    sed -i '' -E 's/"cordova-lib":.*/"cordova-lib": "'$v'",/' cordova-cli/package.json
    sed -i '' -E 's/"cordova-lib":.*/"cordova-lib": "'$v'",/' cordova-plugman/package.json

Update the version of cordova-common that cordova-lib, cli, fetch and create depend on:

    v="$(grep '"version"' cordova-common/package.json | cut -d'"' -f4)"
    sed -i '' -E 's/"cordova-common":.*/"cordova-common": "'$v'",/' cordova-cli/package.json
    sed -i '' -E 's/"cordova-common":.*/"cordova-common": "'$v'",/' cordova-plugman/package.json
    sed -i '' -E 's/"cordova-common":.*/"cordova-common": "'$v'",/' cordova-lib/package.json
    sed -i '' -E 's/"cordova-common":.*/"cordova-common": "'$v'",/' cordova-fetch/package.json
    sed -i '' -E 's/"cordova-common":.*/"cordova-common": "'$v'",/' cordova-create/package.json

Update the version of cordova-js that cordova-lib depends on:

    v="$(grep '"version"' cordova-js/package.json | cut -d'"' -f4)"
    sed -i '' -E 's/"cordova-js":.*/"cordova-js": "'$v'",/' cordova-lib/package.json
    
Update the version of cordova-fetch that cordova-lib & cordova-create depend on:

    v="$(grep '"version"' cordova-fetch/package.json | cut -d'"' -f4)"
    sed -i '' -E 's/"cordova-fetch":.*/"cordova-fetch": "'$v'",/' cordova-lib/package.json
    sed -i '' -E 's/"cordova-fetch":.*/"cordova-fetch": "'$v'",/' cordova-create/package.json

Commit these changes together into one commit

    for l in cordova-plugman cordova-cli cordova-js cordova-create cordova-lib cordova-common cordova-serve cordova-fetch cordova-node-xcode; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git commit -am "$JIRA Updated version and RELEASENOTES.md for release $v" ); done

## Test
Link repos:

    (cd cordova-js && rm -r node_modules && npm install && npm link)
    (cd cordova-common && rm -r node_modules && npm install && npm link)
    (cd cordova-fetch && rm -r node_modules && npm link cordova-common && npm install && npm link)
    (cd cordova-lib && rm -r node_modules && npm link cordova-js && npm link cordova-common && npm link cordova-fetch && npm install && npm link)
    (cd cordova-plugman && rm -r node_modules && npm link cordova-lib && npm install)
    (cd cordova-cli && rm -r node_modules && npm link cordova-lib && npm link cordova-common && npm install)

Check results of `npm audit`: ensure that the latest version of npm is installed (using a command such as `npm i npm@latest`), `package-lock.json` is present (do `npm i --package-lock-only` if needed), and then check:

    (cd cordova-js && npm audit)
    (cd cordova-common && npm audit)
    (cd cordova-fetch && npm audit)
    (cd cordova-lib && npm audit)
    (cd cordova-plugman && npm audit)
    (cd cordova-cli && npm audit)

Ensure license headers are present everywhere. For reference, see this [background](http://www.apache.org/legal/src-headers.html). Expect some noise in the output, for example some files from test fixtures will show up.

    coho audit-license-headers -r js | less
    coho audit-license-headers -r cli | less
    coho audit-license-headers -r plugman | less
    coho audit-license-headers -r lib | less
    coho audit-license-headers -r common | less
    coho audit-license-headers -r fetch | less
    coho audit-license-headers -r serve | less
    coho audit-license-headers -r create | less
    coho audit-license-headers -r node-xcode | less

Ensure all dependencies and subdependencies have Apache-compatible licenses

    coho check-license -r tools

Ensure that mobilespec creates okay via CLI:

    cordova-mobile-spec/createmobilespec/createmobilespec.js --android --ios
    (cd mobilespec && ./cordova build && ./cordova run android)

Ensure uninstall doesn't cause errors:

    (cd mobilespec && ./cordova plugin remove cordova-plugin-file-transfer)

Ensure that mobilespec creates okay via plugman (you may need to manually uninstall previous mobile-spec app):

    cordova-mobile-spec/createmobilespec/createmobilespec.js --plugman --android
    (cd mobilespec-android && ./cordova/run)
    
Ensure unit tests pass (plugman tests are included in lib):

    (cd cordova-lib; npm test)
    (cd cordova-cli; npm test)
    (cd cordova-js; grunt test --platformVersion=4.0.0)
    (cd cordova-fetch; npm test)
    (cd cordova-common; npm test)
    (cd cordova-node-xcode; npm test)

Add a comment to the JIRA issue stating what you tested, and what the results were.


## Tag

    # Review commits:
    for l in cordova-plugman cordova-cli cordova-lib cordova-js cordova-create cordova-common cordova-fetch cordova-serve cordova-node-xcode; do ( cd $l; git log -p origin/master..master ); done
    # Tag
    for l in cordova-plugman cordova-cli cordova-lib cordova-js cordova-create cordova-common cordova-fetch cordova-serve cordova-node-xcode; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git tag $v ); done

## Create release branches if they don't yet exist
If branches don't exist, create new ones

    (cd cordova-cli; git branch 7.2.x) 
    (cd cordova-lib; git branch 7.2.x)
    (cd cordova-js; git branch 4.1.x)
    (cd cordova-create; git branch 1.0.x)
    (cd cordova-plugman; git branch 1.3.x)
    (cd cordova-fetch; git branch 1.0.x)
    (cd cordova-common; git branch 2.2.x)
    (cd cordova-serve; git branch 1.0.x)
    (cd cordova-node-xcode; git branch 1.1.x)
    
If branches already exist, update them

    (cd cordova-js && git checkout 4.1.x && git merge master && git checkout master)

## Re-introduce -dev suffix to versions on master and commit

    for l in cordova-lib cordova-plugman cordova-cli cordova-js cordova-fetch cordova-common cordova-serve cordova-create cordova-node-xcode; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v != *-dev ]]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "$l: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi); done
    for l in cordova-plugman cordova-cli cordova-js cordova-lib cordova-fetch cordova-serve cordova-common cordova-node-xcode; do (cd $l; git commit -am "$JIRA Incremented package version to -dev"; git show ); done

## Push

    for l in cordova-lib cordova-plugman cordova-cli cordova-js cordova-create cordova-common cordova-fetch cordova-serve cordova-node-xcode; do ( cd $l; git push && git push --tags ); done

If the push fails due to not being fully up-to-date, either:
1. Pull in new changes via `git pull --rebase`, and include them in the release notes / re-tag
2. Pull in new changes via `git pull`, and do *not* include them in the release.

If you created new release branches, push them as well e.g: `git push origin 4.2.x`

## Publish to dist/dev & npm
Ensure you have the svn repos checked out:

    coho repo-clone -r dist -r dist/dev

Create archives from your tags:

    coho create-archive -r plugman -r cli -r lib -r js -r common -r fetch -r serve -r create -r node-xcode --dest cordova-dist-dev/$JIRA

Sanity Check:

    coho verify-archive cordova-dist-dev/$JIRA/*.tgz

Upload:

    (cd cordova-dist-dev && svn add $JIRA && svn commit -m "$JIRA Uploading release candidates for tools release")

Find your release here: https://dist.apache.org/repos/dist/dev/cordova/

## Prepare Blog Post
 * Combine highlights from RELEASENOTES.md into a Release Announcement blog post
 * Get blog post proofread via [GitHub](http://github.com/apache/cordova-docs).

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

    PASTE OUTPUT OF: coho print-tags -r js -r lib -r plugman -r cli -r fetch -r common -r serve -r node-xcode

    Upon a successful vote I will upload the archives to dist/, publish them to npm, and post the corresponding blog post.

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
    svn rm tools/cordova-lib-7*
    svn rm tools/cordova-7*
    svn rm tools/plugman-1*
    svn rm tools/cordova-js-4*
    svn rm tools/cordova-fetch-1*
    svn rm tools/cordova-serve-1*
    svn rm tools/cordova-common-2*
    svn rm tools/cordova-create-1*
    svn rm tools/cordova-node-xcode-1*
    cp ../cordova-dist-dev/$JIRA/* tools/
    svn add tools/*
    svn commit -m "$JIRA Published tools release to dist"

    cd ../cordova-dist-dev
    svn up
    svn rm $JIRA
    svn commit -m "$JIRA Removing release candidates from dist/dev"
    cd ..


Find your release here: https://dist.apache.org/repos/dist/release/cordova/tools

## Publish and test from npm
Publish these to npm

    npm publish cordova-dist/tools/cordova-js-4*.tgz
    npm publish cordova-dist/tools/cordova-lib-7*.tgz
    npm publish cordova-dist/tools/cordova-7.*.tgz
    npm publish cordova-dist/tools/plugman-1*.tgz
    npm publish cordova-dist/tools/cordova-fetch-1*.tgz
    npm publish cordova-dist/tools/cordova-common-2*.tgz
    npm publish cordova-dist/tools/cordova-serve-1*.tgz
    npm publish cordova-dist/tools/cordova-create-1*.tgz
    npm publish cordova-dist/tools/cordova-node-xcode-1*.tgz

Test from npm:

    npm -g uninstall cordova
    npm -g install cordova@latest
    cordova create mytest
    cd mytest
    cordova platform add android
    cordova plugin add cordova-plugin-device
    cordova build

### Tell Apache about Release

TODO: Please someone write a coho helper for doing this POST request!

1. Go to: https://reporter.apache.org/addrelease.html?cordova
2. Use version "cordova-$FOO@x.x.x"

## Post Blog Post

Follow https://github.com/apache/cordova-docs#deploying

## Email a release announcement to the mailing list
Subject: [ANNOUNCEMENT] Tools Release

    Cordova-cli@VERSION & Plugman@VERSION has been released!

    You can view the release blog post at LINK_TO_BLOG

## Make permanent release tags

Make a copy of your released tag with a prefix of rel\YOURTAG. These are permanent release tags for Apache.
Do this for all of the tools you just released. For example:

    (cd cordova-lib; git checkout 7.1.0; git tag rel/7.1.0; git push origin --tags; git checkout master)

## Do other announcements

Tweet out blog post and post to #releases in slack

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

These instructions are being kept here in case we decide to start using shrinkwrap again.

Before creating the shrinkwrap on the cli, do the following so that the shrinkwrap will have the correct content:

Publish any dependent modules (cordova-lib, cordova-js) to npm before creating a shrinkwrap of the parent (cordova-cli). This enables the "from" field in the shrinkwrap to have the correct URL. And it prevents any of the submodule's devDependenies from appearing in a parent's shrinkwrap. If you have already packaged and published cordova-js, then you can omit that from the rest of the steps in this bullet level. Here are the steps to do that:

First, commit everything in the dependent modules, tag, and push.

    # Commit:
    for l in cordova-lib cordova-js; do ( cd $l; git add .; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git commit -am "$JIRA Updated version and RELEASENOTES.md for release $v" ); done
    # Review commits:
    for l in cordova-lib cordova-js; do ( cd $l; git log -p origin/master..master ); done
    # Tag
    for l in cordova-lib cordova-js; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git tag $v ); done
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

