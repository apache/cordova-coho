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

# Release Process for Cordova Core Plugins

This page describes the steps for doing a Plugins Release.

## Table of Contents

- [General Instructions](#general-instructions)
  * [Read first](#read-first)
  * [Repository setup](#repository-setup)
- [Interactive Plugins Release](#interactive-plugins-release)
- [Manual](#manual)
  * [Before you start](#before-you-start)
    + [Identify which plugins have changes](#identify-which-plugins-have-changes)
    + [Choose a Release Identifier](#choose-a-release-identifier)
    + [Request buy-in](#request-buy-in)
  * [Before Release](#before-release)
    + [Make sure you're up-to-date](#make-sure-youre-up-to-date)
    + [Check dependencies](#check-dependencies)
      - [Resolve any outdated dependencies](#resolve-any-outdated-dependencies)
    + [`npm audit` check](#npm-audit-check)
    + [License Check](#license-check)
  * [Prepare Release](#prepare-release)
    + [Update Version](#update-version)
    + [Create Release Notes](#create-release-notes)
    + [Commit Release Notes and optional version changes together](#commit-release-notes-and-optional-version-changes-together)
  * [Testing](#testing)
  * [Push Changes](#push-changes)
    + [Tag](#tag)
    + [Create Release Branch](#create-release-branch)
    + [Update version to add back `-dev` suffix](#update-version-to-add-back--dev-suffix)
    + [Push tags, branches and changes](#push-tags-branches-and-changes)
  * [Publish Release Candidate to `dist/dev`](#publish-release-candidate-to-distdev)
  * [Documentation and Communication](#documentation-and-communication)
    + [Prepare Blog Post](#prepare-blog-post)
  * [Voting and Release](#voting-and-release)
    + [Start VOTE Thread](#start-vote-thread)
    + [Voting](#voting)
    + [Email the result of the vote](#email-the-result-of-the-vote)
    + [If the Vote does *not* Pass](#if-the-vote-does-not-pass)
    + [Otherwise: Publish release to `dist/` & npm](#otherwise-publish-release-to-dist--npm)
    + [Add permanent Apache release tag to repository](#add-permanent-apache-release-tag-to-repository)
  * [Follow up steps](#follow-up-steps)
    + [Tell Apache about Release](#tell-apache-about-release)
    + [Publish the prepared blog post](#publish-the-prepared-blog-post)
    + [Email a release announcement to the mailing list](#email-a-release-announcement-to-the-mailing-list)
    + [Finally:](#finally)

<!--<small><i><a href='http://ecotrust-canada.github.io/markdown-toc/'>Table of contents generated with markdown-toc</a></i></small>-->


## General Instructions

### Read first

- Before cutting any releases, read the Apache's [Releases Policy](http://www.apache.org/dev/release)
- If you have not done so already, create a GPG key (see: [setting-up-gpg.md](setting-up-gpg.md)).
- Core Plugins are released at most weekly (see: [versioning-and-release-strategy.md](versioning-and-release-strategy.md)).

Important: This whole release process does _not_ work in **Windows** Command Prompt or Powershell. If you really want to do this release process on Windows, you have to use [Git Bash](https://gitforwindows.org/#bash) or similar.

### Repository setup

You should have your platform repository checked out in a folder where you also have checked out all/most/some of the other Cordova repositories. If you followed the [Cloning/Updating Cordova repositories
](../README.md#cloningupdating-cordova-repositories) instructions of `cordova-coho`, and used `coho repo-clone`, this should already be the case.

## Interactive Plugins Release

The coho interactive plugins release command which will handle many of the manual steps listed below.

`coho prepare-plugins-release`

This will do the following:

* Ask for Release Identifier
* Update repos
* Let you select which repos to release
* Let you modify release notes and finalize version to release
* Branch, tag and push up to master
* Increment version on master with `-dev`
* Create svn dist archives for you to share with the cordova list for voting purposes.

(Caution: This interactive process still has some kinks)

## Manual

Try to the interactive plugins release process. If you struggle with, use the manual process which is documented below. 


### Before you start

#### Identify which plugins have changes

This whole process depends on the `ACTIVE` environment variable being set and containing a list of the plugins you want to release. This command can automatically select the plugins that need a release:

TODO How does it figure out which need a release?
TODO Does this actually work? On Windows it sure doesn't.

    ACTIVE=$(for l in cordova-plugin-*; do ( cd $l; last_release=$(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD); git log --pretty=format:'* %s' --topo-order --no-merges $last_release..master | grep -v "Incremented plugin version" > /dev/null && echo $l); done | xargs echo)
    echo $ACTIVE

If you don't want to release all plugins, but you have specific plugins you want to release, you need to set `ACTIVE` equal to them:

    ACTIVE="cordova-plugin-camera cordova-plugin-contacts cordova-plugin-device-motion"
    echo $ACTIVE

#### Choose a Release Identifier

Releases are identified by a "Release Identifier" that is used in commit messages and for temporary folders. Good choices are unique and have a direct relation to the release you are about to perform. Examples for valid identifiers would be `plugins20190506` or `splashscreen@503`.

You set it similar to the active plugins:

```
RELEASE=plugins20190506
echo $RELEASE
```

#### Request buy-in

Email the dev mailing-list at <dev@cordova.apache.org> and see if anyone has reason to postpone the release.

E.g.:

    Subject: [DISCUSS] Cordova Plugins Release

    Does anyone have any reason to delay a Cordova plugins release?
    Any outstanding patches to land?

    If not, I will start the release tomorrow.

Make sure to adapt the subject and content to the actual plugins you want to release.

Note that it would be possible to continue with some of the [Before Release](#before-release) items while waiting for a possible response.


### Before Release

#### Make sure you're up-to-date

    # Update your repos
    coho repo-status -r plugins -b master           # check if there are any unpushed changes in the repos
    coho repo-update -r plugins                     # updates the repos
    coho repo-clone -r plugins                      # clone any possibly missing plugin repos
    coho foreach -r plugins "git checkout master"   # make sure all plugins have master checked out

#### Check dependencies

TODO How to run for many repo folders?

See if any dependencies are outdated

    (cd ... && npm outdated --depth=0)

(The `--depth=0` prevents from listing dependencies of dependencies.)

##### Resolve any outdated dependencies

**Alternative 1:**

- Explicitly pin the outdated dependency versions in the `dependencies` section of `package.json`.
- Raise a new issue to update the dependencies in an upcoming release.

**Alternative 2:**

Within a new Pull Request: update any outdated dependencies in the project's `package.json` file. Be sure to run through the test section below for compatibility issues.

#### `npm audit` check

TODO How to run `npm audit` for many repo folders?

#### License Check

Ensure license headers are present everywhere. For reference, see this [background](http://www.apache.org/legal/src-headers.html). Expect some noise in the output, for example some files from test fixtures will show up.

    coho audit-license-headers -r active-plugins | less
    
TODO only run for $ACTIVE
    
Tip: Skim by searching for "Unknown Licenses" where the number infront it not 0.

Ensure all dependencies and subdependencies have Apache-compatible licenses.

    coho check-license -r active-plugins
 
TODO only run for $ACTIVE

### Prepare Release

#### Update Version

Remove the `-dev` suffix on the version in `plugin.xml`:

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; v2="${v%-dev}"; if [ "$v" != "$v2" ]; then echo "$l: Setting version in plugin.xml to $v2"; sed -i -E s:"version=\"$v\":version=\"$v2\":" plugin.xml; fi) ; done

Remove the `-dev` suffix on the version in `package.json`:

    for l in $ACTIVE; do ( cd $l; v="$(grep -m 1 '"version"' package.json | cut -d'"' -f4)"; if [[ $v = *-dev ]]; then v2="${v%-dev}"; echo "$l: Setting version in package.json to $v2"; sed -i -E '1,/version":.*/s/version":.*/version": "'$v2'",/' package.json; fi) ; done

For each of the plugins that have a test project inside it, update the version number there (`cordova-plugin-*/tests/plugin.xml`) to match the version of the plugin itself (`cordova-plugin-*/plugin.xml`).

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; vt="$(grep version= tests/plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; if [ "$v" != "$vt" ]; then echo "$l: Setting version in tests/plugin.xml to $v"; sed -i -E s:"version=\"$vt\":version=\"$v\":" tests/plugin.xml; fi); done

And same for `cordova-plugin-*/tests/package.json` and `cordova-plugin-*/package.json`:

    for l in $ACTIVE; do ( cd $l; v="$(grep -m 1 '"version"' package.json | cut -d'"' -f4)"; vt="$(grep -m 1 '"version"' tests/package.json | cut -d'"' -f4)"; if [ "$v" != "$vt" ]; then echo "$l: Setting version in tests/package.json to $v"; sed -i -E '1,/version":.*/s/version":.*/version": "'$v'",/' tests/package.json; fi); done

##### Minor or Major version update

If the changes merit it, manually bump the major / minor version instead of the patch version. Manual process, but list the changes via:

    for l in $ACTIVE; do ( cd $l; echo $l; last_release=$(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD); git log --pretty=format:'* %s' --topo-order --no-merges $last_release..master | grep -v "Incremented plugin version" ); done

If this justifies or requires a major / minor version update, manually edit the version numbers in the files that currently already have uncommitted changes.

#### Create Release Notes

Update their `RELEASENOTES.md` files with changes since the last release:

    for l in $ACTIVE; do (coho update-release-notes -r $l); done

Then curate:

    vim ${ACTIVE// //RELEASENOTES.md }/RELEASENOTES.md

or use your favorite text editor manually.

#### Commit Release Notes and optional version changes together

Commit these changes (`plugin.xml`, `package.json`, `RELEASENOTES.md`, `tests/plugin.xml`) together:

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; git commit -am "Updated version and RELEASENOTES.md for release $v ($RELEASE)"); done

Reply to the DISCUSS thread with a link to the updated release notes.

### Testing

TODO This will only work if you have _all_ the Cordova plugins checked out via Coho, not just a few of them

Create mobilespec and sanity check all plugins on at least one platform (preferably, a released version of the platform and not master). Run through mobilespec, ensuring to do manual tests that relate to changes in the `RELEASENOTES.md`:

    cordova-mobile-spec/createmobilespec/createmobilespec.js --android --ios
    (cd mobilespec && ./cordova build && ./cordova run android --device)
    (cd mobilespec && ./cordova build && ./cordova run ios --device)

This should start a black-ish app with a "Plugin tests" button. When clicking it you end up in a screen with "Auto Tests" and "Manual Tests" buttons. You should run both and see if all/most/the expected ones succeed.

### Push Changes

#### Tag

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; echo "Tagging $l to $v"; git tag "$v" ); done

#### Create Release Branch

If there currently is no release branch (e.g. `5.0.x`) on the remote, you can create one with this command:

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; b=`expr $v : '^\(....\)'`; x="x"; b=$b$x; git branch $b; echo "Creating branch $b for $l"); done

##### Update Release Branch

If a release branch already exists on the remote, you will have to manually checkout the branch, merge `master` into it and then checkout `master` again:

    # in each plugin
    v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; b=`expr $v : '^\(....\)'`; x="x"; b=$b$x;
    git checkout $b
    git merge master
    # fix eventual merge conflicts and commit
    git checkout master

#### Update version to add back `-dev` suffix

    # update plugin.xml
    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; v_no_dev="${v%-dev}"; if [ "$v" = "$v_no_dev" ]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "$l: Setting version in plugin.xml to $v2"; sed -i -E s:"version=\"$v\":version=\"$v2\":" plugin.xml; fi) ; done
    
    # update package.json
    for l in $ACTIVE; do ( cd $l; v="$(grep -m 1 '"version"' package.json | cut -d'"' -f4)"; if [[ $v != *-dev ]]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "$l: Setting version in package.json to $v2"; sed -i -E '1,/version":.*/s/version":.*/version": "'$v2'",/' package.json; fi); done
    
    # update the nested test plugin.xml
    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; vt="$(grep version= tests/plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; if [ "$v" != "$vt" ]; then echo "$l: Setting version in tests/plugin.xml to $v"; sed -i -E s:"version=\"$vt\":version=\"$v\":" tests/plugin.xml; fi); done
    
    # update the nested test package.json
    for l in $ACTIVE; do ( cd $l; v="$(grep -m 1 '"version"' package.json | cut -d'"' -f4)"; vt="$(grep -m 1 '"version"' tests/package.json | cut -d'"' -f4)"; if [ "$v" != "$vt" ]; then echo "$l: Setting version in tests/package.json to $v"; sed -i -E '1,/version":.*/s/version":.*/version": "'$v'",/' tests/package.json; fi); done
    
    # commit
    for l in $ACTIVE; do (cd $l; git commit -am "Incremented plugin version. ($RELEASE)" ); done

#### Push tags, branches and changes

First command shows which commit will be pushed, second one if there are uncommited files in any of the plugin checkouts.

    # Sanity check:
    coho repo-status -r plugins
    coho foreach -r plugins "git status -s"
    
 Then push the changes (commits in `master`, tag and release branch):
    
    # Push: (assumes "origin" is apache remote)
    for l in $ACTIVE; do ( cd $l; tag=$(git describe --tags --abbrev=0); echo $l; set -x; git push origin master && git push origin refs/tags/$tag); done
    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; b=`expr $v : '^\(....\)'`; x="x"; b=$b$x; git push origin $b;); done
    
 Finally check it's all pushed now:
 
    # Check that it was all successful:
    coho repo-update -r plugins
    coho repo-status -r plugins

### Publish Release Candidate to `dist/dev`

**Attention**: The following steps need [SVN](https://subversion.apache.org/packages.html#windows) installed and [unfortunately don't give an error if it is not, failing silently](https://issues.apache.org/jira/browse/CB-8006). You also need do [have a secret key set up](setting-up-gpg.md) for signing the release.

Ensure you have the svn repos checked out:

    coho repo-clone -r dist -r dist/dev

Create archives from your tags:

    coho create-archive -r ${ACTIVE// / -r } --dest cordova-dist-dev/$RELEASE

Sanity Check:

    # Manually double check version numbers are correct on the file names
    # Then run:
    coho verify-archive cordova-dist-dev/$RELEASE/*.tgz

Upload:

    (cd cordova-dist-dev && svn up && svn add $RELEASE && svn commit -m "Uploading release candidates for plugins release ($RELEASE)")

If everything went well the Release Candidate will show up here: https://dist.apache.org/repos/dist/dev/cordova/

### Documentation and Communication

#### Prepare Blog Post

* Gather highlights from `RELEASENOTES.md` into a Release Announcement blog post  
  This command can do that automatically:
    
      for l in $ACTIVE; do (cd $l; current_release=$(git describe --tags --abbrev=0); previous_release=$(git describe --abbrev=0 --tags `git rev-list --tags --skip=1 --max-count=1`); echo "$l@$current_release"; awk '/### '$current_release'.*/,/### '$previous_release'.*/ {temp=match($0,/### '$previous_release'/); title=match($0, /### '$current_release'/); if(temp == 0 && title == 0) print $0}' < RELEASENOTES.md); done

* Instructions on publishing a blog post are on the [`cordova-docs` repo](https://github.com/apache/cordova-docs#writing-a-blog-post)
* Get blog post proofread by submitting a PR to `cordova-docs` and asking someone on dev list to +1 it.

### Voting and Release

#### Start VOTE Thread

Send an email to dev ML with:

__Subject:__

    [VOTE] Plugins Release

__Body:__

    Please review and vote on the release of this plugins release
    by replying to this email (and keep discussion on the DISCUSS thread)

    The plugins have been published to dist/dev:
    https://dist.apache.org/repos/dist/dev/cordova/$RELEASE/

    The packages were published from their corresponding git tags:
    ### PASTE OUTPUT OF: coho print-tags -r ${ACTIVE// / -r }

    Upon a successful vote I will upload the archives to dist/, upload them to npm, and post the corresponding blog post.

    Voting guidelines: https://github.com/apache/cordova-coho/blob/master/docs/release-voting.md
    How to vote on a plugins release at https://github.com/apache/cordova-coho/blob/master/docs/plugins-release-process.md#voting

    Voting will go on for a minimum of 48 hours.

    I vote +1:
    * Ran coho audit-license-headers over the relevant repos
    * Ran coho check-license to ensure all dependencies and subdependencies have Apache-compatible licenses
    * Ensured continuous build was green when repos were tagged

Replace `$RELEASE` and `### ...` line with the actual values!

#### Voting

TODO

Steps to verify a plugins release

1) Setup
  Repo clone can be skipped if you have cordova-dist-dev. Warning, this requires svn setup.

    coho repo-clone -r cordova-dist-dev
    (cd cordova-dist-dev && svn up)

2) Verify

Verify the release:

    // Verify the archive
    // $RELEASE should be included in the vote email
    coho verify-archive cordova-dist-dev/$RELEASE/*.tgz
    
    // update local checkouts
    coho repo-update -r plugins
    
    // check licences
    coho check-license -r active-plugins
    coho audit-license-headers -r active-plugins | less
    // Tip: Skim by searching for "Unknown Licenses"

3) Test

Check plugins CI

(Optional locally run `mobile-spec`)

    cordova-mobile-spec/createmobilespec/createmobilespec.js --android --ios
    (cd mobilespec && ./cordova build && ./cordova run android --device)
    (cd mobilespec && ./cordova build && ./cordova run ios --device)

TODO

#### Email the result of the vote

Respond to the vote thread with:

    The vote has now closed. The results are:

    Positive Binding Votes: (# of PMC members that +1'ed)

    .. names of all +1 PMC members ..

    Negative Binding Votes: (# of PMC members that -1'ed)

    .. names of all -1 PMC members ..

    Other Votes:

    .. list any non-binding votes, from non-PMC members ..

    The vote has passed.

If there were any votes from non-pmc, include them in an additional `Non-Binding` section.

    Positive Non-Binding Votes: (# that +1'ed)

    .. names of all +1 non-PMC members ..

    Negative Non-Binding Votes: (# that -1'ed)

    .. names of all -1 non-PMC members ..

_Note: list of PMC members: http://people.apache.org/phonebook.html?pmc=cordova_

#### If the Vote does *not* Pass

* Revert commit adding `-dev` on master branch
* Address the concerns (on master branch)
* Re-tag release using `git tag -f`
* 
* Add back `-dev`
* Start a new vote

#### Otherwise: Publish release to `dist/` & npm

If you've lost your list of ACTIVE, you can recreate it from the voted on release:

    ACTIVE=$(cd cordova-dist-dev/$RELEASE; ls *.tgz | sed -E 's:-[^-]*$::')

Publish:

    cd cordova-dist
    svn up
    for l in $ACTIVE; do ( svn rm plugins/$l* ); done
    cp ../cordova-dist-dev/$RELEASE/* plugins/
    svn add plugins/*
    svn commit -m "Published plugins release to dist ($RELEASE)"

Find your release here: https://dist.apache.org/repos/dist/release/cordova/plugins/

Then you can also remove the release candidate from `dist-dev/`:

    cd ../cordova-dist-dev
    svn up
    svn rm $RELEASE
    svn commit -m "Removing release candidates from dist/dev ($RELEASE)"
    cd ..

And finally you can publish your package to npm:

    cd cordova-dist/plugins
    for l in $ACTIVE; do (
        npm publish $l-*.tgz
    ) done;

#### Add permanent Apache release tag to repository

Make a copy of your released tag with a prefix of `rel\YOURTAG`:

    for l in $ACTIVE; do ( cd $l; tag=$(git describe --tags --abbrev=0); git checkout $tag; git tag 'rel/'$tag; git push origin refs/tags/'rel/'$tag; git checkout master); done
    
These are permanent release tags for Apache.

    
### Follow up steps

#### Tell Apache about Release

1. Go to: https://reporter.apache.org/addrelease.html?cordova
2. Use `cordova-plugin-$FOO@x.x.x` as "Full version name"
3. Click "Update release data" to submit it to the list

#### Publish the prepared blog post

Merge the prepare Pull Request with the blog post to publish it on the Cordova Blog.

#### Email a release announcement to the mailing list

    Subject: [ANNOUNCE] Plugin Release
    
    cordova-plugin-xxx@VERSION has been released!
    
    Blog: http://cordova.apache.org/news/YYYY/MM/DD/plugin-release.html
    Tweet: https://twitter.com/apachecordova/status/xxxxxxxxxxxx

#### Finally:

 * Update *these instructions* if they were missing anything.

