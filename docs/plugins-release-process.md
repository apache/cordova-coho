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

# Release Process for ''Core Plugins''

Before cutting any releases, read the Apache's [Releases Policy](http://www.apache.org/dev/release)

If you have not done so already, create a GPG key (see: [setting-up-gpg.md](setting-up-gpg.md)).

Core Plugins are released at most weekly (see: [versioning-and-release-strategy.md](versioning-and-release-strategy.md)).

A plugins release is performed by a single person each week. We call this person the "Release Manager". How to select the Release Manager is still TDB.

TODO: We may want to be using [signed tags](http://git-scm.com/book/en/Git-Basics-Tagging), or at least annotated tags.

TODO: Add step about ensuring plugman owner
  * Note: can base this on: https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/dev-bin/check-published-plugin.js

TODO: Add step about releasing cordova-plugins

TODO: Should not mention testing other than checking medic

## Get Buy-in

 1. Email the dev mailing-list and see if anyone has reason to postpone the release.
   * Subject should be "[DISCUSS] Plugins release
   * If so, agree upon a branching date / time.

## Create JIRA issues

 * Create a JIRA issue to track the status of the release.
   * Make it of type "Task"
   * Subject should be "Plugins Release _Feb 2, 2014_" (Use the current date, not the expected release date)
   * Description should be: "Following steps at https://github.com/apache/cordova-coho/blob/master/docs/plugins-release-process.md"
   * Assignee should be the Release Manager
 * Comments should be added to this bug after each top-level step below is taken
 * Set an environment variable in your terminal for use later on:


    JIRA="CB-????" # Set this to the release bug.


## Make sure you're up-to-date

    # Update your repos
    coho repo-status -r plugins -b master
    coho repo-update -r plugins
    coho repo-clone -r plugins
    coho foreach -r plugins "git checkout master"

## Identify which plugins have changes

    ACTIVE=$(for l in cordova-plugin-*; do ( cd $l; last_release=$(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD); git log --pretty=format:'* %s' --topo-order --no-merges $last_release..master | grep -v "Incremented plugin version" > /dev/null && echo $l); done | xargs echo)
    echo $ACTIVE

If you don't want to release all plugins, but you have specific plugins you want to release, you need to set `ACTIVE` equal to them.

    ACTIVE="cordova-plugin-camera cordova-plugin-contacts cordova-plugin-device-motion"
    echo $ACTIVE

## Ensure license headers are present everywhere:

    coho audit-license-headers -r active-plugins | less
    # Tip: Skim by searching for "Unknown Licenses"

For reference, see this [background](http://www.apache.org/legal/src-headers.html)

## Ensure all dependencies and subdependencies have Apache-compatible licenses

    coho check-license -r active-plugins

## Update RELEASENOTES.md & Version
Remove the ''-dev'' suffix on the version in plugin.xml.

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; v2="${v%-dev}"; if [ "$v" != "$v2" ]; then echo "$l: Setting version in plugin.xml to $v2"; sed -i '' -E s:"version=\"$v\":version=\"$v2\":" plugin.xml; fi) ; done

Remove the ''-dev'' suffix on the version in package.json.

    for l in $ACTIVE; do ( cd $l; v="$(grep -m 1 '"version"' package.json | cut -d'"' -f4)"; if [[ $v = *-dev ]]; then v2="${v%-dev}"; echo "$l: Setting version in package.json to $v2"; sed -i '' -E '1,/version":.*/s/version":.*/version": "'$v2'",/' package.json; fi) ; done

If the changes merit it, manually bump the major / minor version instead of the micro. Manual process, but list the changes via:

    for l in $ACTIVE; do ( cd $l; echo $l; last_release=$(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD); git log --pretty=format:'* %s' --topo-order --no-merges $last_release..master | grep -v "Incremented plugin version" ); done

For each of the plugins that have a test project inside it, update the version number there (`cordova-plugin-*/tests/plugin.xml`) to match the version of the plugin itself (`cordova-plugin-*/plugin.xml`).

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; vt="$(grep version= tests/plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; if [ "$v" != "$vt" ]; then echo "$l: Setting version to $v"; sed -i '' -E s:"version=\"$vt\":version=\"$v\":" tests/plugin.xml; fi); done

Update its RELEASENOTES.md file with changes.

    for l in $ACTIVE; do (coho update-release-notes -r $l); done
    # Then curate:
    vim ${ACTIVE// //RELEASENOTES.md }/RELEASENOTES.md

Commit these changes together (plugin.xml, RELEASENOTES.md, tests/plugin.xml)

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; git commit -am "$JIRA Updated version and RELEASENOTES.md for release $v"); done

Reply to the DISCUSS thread with a link to the updated release notes.

## Tag

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; echo "Tagging $l to $v"; git tag "$v" ); done

## Test
 Create mobilespec and sanity check all plugins on at least one platform (preferably, a released version of the platform and not master). Run through mobilespec, ensuring to do manual tests that relate to changes in the RELEASENOTES.md


    cordova-mobile-spec/createmobilespec/createmobilespec.js --android --ios
    (cd mobilespec && ./cordova build && ./cordova run android --device)
    (cd mobilespec && ./cordova build && ./cordova run ios --device)

## Create Release Branch

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; b=`expr $v : '^\(....\)'`; x="x"; b=$b$x; git branch $b; echo "Creating branch $b for $l"); done

If a branch already exists, you will have to manually checkout the branch, merge master and then checkout master. 

## Update version to add back -dev suffix

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; v_no_dev="${v%-dev}"; if [ "$v" = "$v_no_dev" ]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "$l: Setting version in plugin.xml to $v2"; sed -i '' -E s:"version=\"$v\":version=\"$v2\":" plugin.xml; fi) ; done
    # update package.json
    for l in $ACTIVE; do ( cd $l; v="$(grep -m 1 '"version"' package.json | cut -d'"' -f4)"; if [[ $v != *-dev ]]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "$l: Setting version in package.json to $v2"; sed -i '' -E '1,/version":.*/s/version":.*/version": "'$v2'",/' package.json; fi); done
    # update the nested test
    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; vt="$(grep version= tests/plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; if [ "$v" != "$vt" ]; then echo "$l: Setting version to $v"; sed -i '' -E s:"version=\"$vt\":version=\"$v\":" tests/plugin.xml; fi); done
    for l in $ACTIVE; do (cd $l; git commit -am "$JIRA Incremented plugin version." ); done

## Push tags, branches and changes
    # Sanity check:
    coho repo-status -r plugins
    coho foreach -r plugins "git status -s"
    # Push: (assumes "origin" is apache remote)
    for l in $ACTIVE; do ( cd $l; tag=$(git describe --tags --abbrev=0); echo $l; set -x; git push origin master && git push origin refs/tags/$tag); done
    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; b=`expr $v : '^\(....\)'`; x="x"; b=$b$x; git push origin $b;); done
    # Check that it was all successful:
    coho repo-update -r plugins
    coho repo-status -r plugins

## Publish to dist/dev
Ensure you have the svn repos checked out:

    coho repo-clone -r dist -r dist/dev

Create archives from your tags:

    coho create-archive -r ${ACTIVE// / -r } --dest cordova-dist-dev/$JIRA

Sanity Check:

    # Manually double check version numbers are correct on the file names
    # Then run:
    coho verify-archive cordova-dist-dev/$JIRA/*.tgz

Upload:

    (cd cordova-dist-dev && svn up && svn add $JIRA && svn commit -m "$JIRA Uploading release candidates for plugins release")

* Find your release here: https://dist.apache.org/repos/dist/dev/cordova/

## Prepare Blog Post
Run the following script to get release notes from RELEASENOTS.md.

    for l in $ACTIVE; do (cd $l; current_release=$(git describe --tags --abbrev=0); previous_release=$(git describe --abbrev=0 --tags `git rev-list --tags --skip=1 --max-count=1`); echo "$l@$current_release"; awk '/### '$current_release'.*/,/### '$previous_release'.*/ {temp=match($0,/### '$previous_release'/); title=match($0, /### '$current_release'/); if(temp == 0 && title == 0) print $0}' < RELEASENOTES.md); done

 * Combine the output from above into a Release Announcement blog post
   * Instructions on [sites page README](https://svn.apache.org/repos/asf/cordova/site/README.md)
 * Get blog post proof-read.

## Start VOTE Thread
Send an email to dev ML with:

__Subject:__

    [VOTE] Plugins Release

__Body:__

    Please review and vote on the release of this plugins release
    by replying to this email (and keep discussion on the DISCUSS thread)

    Release issue: https://issues.apache.org/jira/browse/CB-XXXX

    The plugins have been published to dist/dev:
    https://dist.apache.org/repos/dist/dev/cordova/CB-XXXX/

    The packages were published from their corresponding git tags:
    PASTE OUTPUT OF: coho print-tags -r ${ACTIVE// / -r }

    Upon a successful vote I will upload the archives to dist/, upload them to npm, and post the corresponding blog post.

    Voting guidelines: https://github.com/apache/cordova-coho/blob/master/docs/release-voting.md
    How to vote on a plugins release at https://github.com/apache/cordova-coho/blob/master/docs/plugins-release-process.md#voting

    Voting will go on for a minimum of 48 hours.

    I vote +1:
    * Ran coho audit-license-headers over the relevant repos
    * Ran coho check-license to ensure all dependencies and subdependencies have Apache-compatible licenses
    * Ensured continuous build was green when repos were tagged



## Voting
Steps to verify a plugins release

1) Setup
Repo clone can be skipped if you have cordova-dist-dev. Warning, this requires svn setup.

    coho repo-clone -r cordova-dist-dev
    (cd cordova-dist-dev && svn up)

2) Verify

    coho verify-archive cordova-dist-dev/$JIRA/*.tgz
    coho repo-update -r plugins
    coho check-license -r active-plugins
    coho audit-license-headers -r active-plugins | less
    # Tip: Skim by searching for "Unknown Licenses"

3) Test

Review [ci.cordova.io](http://ci.cordova.io/).

(Optional locally run `mobile-spec`)

    cordova-mobile-spec/createmobilespec/createmobilespec.js --android --ios
    (cd mobilespec && ./cordova build && ./cordova run android --device)
    (cd mobilespec && ./cordova build && ./cordova run ios --device)


## Email the result of the vote
Respond to the vote thread with:

__Subject:__

    [RESULT][VOTE] Plugins Release

__Body:__

    The vote has now closed. The results are:

    Positive Binding Votes: (# of PMC members that +1'ed)

    .. names of all +1 PMC members ..

    Negative Binding Votes: (# of PMC members that -1'ed)

    .. names of all -1 PMC members ..

    Other Votes:

    .. list any non-binding votes, from non-PMC members ..

    The vote has passed.

_Note: list of PMC members: http://people.apache.org/phonebook.html?pmc=cordova_

## If the Vote does *not* Pass
* Revert adding of `-dev` on master branch
* Address the concerns (on master branch)
* Re-tag release using `git tag -f`
* Add back `-dev`
* Start a new vote


## Publish to dist/

If you've lost your list of ACTIVE:

    ACTIVE=$(cd cordova-dist-dev/$JIRA; ls *.tgz | sed -E 's:-[^-]*$::')

Publish:

    cd cordova-dist
    svn up
    for l in $ACTIVE; do ( svn rm plugins/$l* ); done
    cp ../cordova-dist-dev/$JIRA/* plugins/
    svn add plugins/*
    svn commit -m "$JIRA Published plugins release to dist"

    cd ../cordova-dist-dev
    svn up
    svn rm $JIRA
    svn commit -m "$JIRA Removing release candidates from dist/dev"
    cd ..

Find your release here: https://dist.apache.org/repos/dist/release/cordova/plugins/

### Tell Apache about Release

TODO: Please someone write a coho helper for doing this POST request!

1. Go to: https://reporter.apache.org/addrelease.html?cordova
2. Use version "cordova-plugin-$FOO@x.x.x"

## Publish to npm

    cd cordova-dist/plugins
    for l in $ACTIVE; do (
        npm publish $l-*.tgz
    ) done;

## Add new apache release tags

Make a copy of your released tag with a prefix of `rel\YOURTAG`. These are permanent release tags for Apache. 

    for l in $ACTIVE; do ( cd $l; tag=$(git describe --tags --abbrev=0); git checkout $tag; git tag 'rel/'$tag; git push origin refs/tags/'rel/'$tag; git checkout master); done

## Post blog Post


Add blog post markdown file like `www/_posts/2016-03-12-plugin-release.md`

Send PR to https://github.com/apache/cordova-docs

See full instructions in the cordova-docs [README](https://github.com/apache/cordova-docs#writing-a-blog-post)

Run a production build:

    node_modules/.bin/gulp build --prod

Output is located in `build-prod`

    cd cordova-website
    svn update
Files and directories to update in `cordova-website` svn

    cp -r ../cordova-docs/build-prod/announcements/2016/* public/announcements/2016/
    cp ../cordova-docs/build-prod/blog/index.html public/blog/index.html
    cp ../cordova-docs/build-prod/feed.xml public/feed.xml
    cp -r ../cordova-docs/build-prod/news/2016/* public/news/2016/


Add link for new post to  `public/sitemap.xml`
<url>
    <loc>/news/2016/03/12/plugin-release.html</loc>
</url>

Add a new date to   `public/static/js/index.js`
like `dates.push('Sat, 12 Mar 2016 00:00:00 +0300');`

    svn status
    svn add $NEW_FILES_HERE
    svn update
    # commit the new and modified files
    svn commit -m "Add blog post for plugin release $JIRA"

## Do other announcements

    Do the same things regarding announcements as described in cadence-release-process, where they make sense.

Send email to dev list with a subject [ANNOUNCE] Plugin Release and include blog post and tweet links

__Subject:__
    
    [ANNOUNCE] Plugin Release

__Body:__
 
    Blog: http://cordova.apache.org/news/YYYY/MM/DD/plugin-release.html
    Tweet: https://twitter.com/apachecordova/status/xxxxxxxxxxxx

## Close JIRA Issue
 * Double check that the issue has comments that record the steps you took
 * Mark it as fixed

## Finally:

 * Update *these instructions* if they were missing anything.

