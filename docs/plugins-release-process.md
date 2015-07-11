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

    coho audit-license-headers -r plugins | less
    # Tip: Skim by searching for "Unknown Licenses"

For reference, see this [background](http://www.apache.org/legal/src-headers.html)

## Ensure all dependencies and subdependencies have Apache-compatible licenses

    coho check-license -r plugins

## Update RELEASENOTES.md & Version
Remove the ''-dev'' suffix on the version in plugin.xml.

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; v2="${v%-dev}"; if [ "$v" != "$v2" ]; then echo "$l: Setting version in plugin.xml to $v2"; sed -i '' -E s:"version=\"$v\":version=\"$v2\":" plugin.xml; fi) ; done

Remove the ''-dev'' suffix on the version in package.json.

    for l in $ACTIVE; do ( cd $l; v="$(grep -m 1 '"version"' package.json | cut -d'"' -f4)"; if [[ $v = *-dev ]]; then v2="${v%-dev}"; echo "$l: Setting version in package.json to $v2"; sed -i '' -E '1,/version":.*/s/version":.*/version": "'$v2'",/' package.json; fi) ; done

If the changes merit it, manually bump the major / minor version instead of the micro. Manual process, but list the changes via:

    for l in $ACTIVE; do ( cd $l; echo $l; last_release=$(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD); git log --pretty=format:'* %s' --topo-order --no-merges $last_release..master | grep -v "Incremented plugin version" ); done

For each of the plugins that have a test project inside it, update the version number there (`cordova-plugin-*/tests/plugin.xml`) to match the version of the plugin itself (`cordova-plugin-*/plugin.xml`).

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; vt="$(grep version= tests/plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; if [ "$v" != "$vt" ]; then echo "$l: Setting version to $v"; sed -i '' -E s:"version=\"$vt\":version=\"$v\":" tests/plugin.xml; fi); done

Update its RELEASENOTES.md file with changes

    # Add new heading to release notes with version and date
    DATE=$(date "+%h %d, %Y")
    for l in $ACTIVE; do ( cd $l; last_release=$(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD); v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; echo -e "\n### $v ($DATE)" >> RELEASENOTES.md; git log --pretty=format:'* %s' --topo-order --no-merges $last_release..master | grep -v "Incremented plugin version" >> RELEASENOTES.md); done
    # Then curate:
    vim ${ACTIVE// //RELEASENOTES.md }/RELEASENOTES.md

Add a comment to the JIRA issue with the output from (we'll use this later for the blog post):

    for l in $ACTIVE; do ( cd $l; id="$(grep id= plugin.xml | grep -v xml | grep -v engine | grep -v param | head -1 | cut -d'"' -f2)"; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; echo $id@$v; awk "{ if (p) print } /$DATE/ { p = 1 } " < RELEASENOTES.md; echo); done

Commit these changes together (plugin.xml, RELEASENOTES.md, tests/plugin.xml)

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; git commit -am "$JIRA Updated version and RELEASENOTES.md for release $v"); done

Reply to the DISCUSS thread with a link to the updated release notes.

## Tag

    for l in $ACTIVE; do ( cd $l; v="r$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; echo "Tagging $l to $v"; git tag "$v" ); done

## Test
 * Create mobilespec and sanity check all plugins on at least one platform (preferably, a released version of the platform and not master)
 * Run through mobilespec, ensuring to do manual tests that relate to changes in the RELEASENOTES.md

## Update version to add back -dev suffix

    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; v_no_dev="${v%-dev}"; if [ "$v" = "$v_no_dev" ]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "$l: Setting version in plugin.xml to $v2"; sed -i '' -E s:"version=\"$v\":version=\"$v2\":" plugin.xml; fi) ; done
    # update package.json
    for l in $ACTIVE; do ( cd $l; v="$(grep -m 1 '"version"' package.json | cut -d'"' -f4)"; if [[ $v != *-dev ]]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "$l: Setting version in package.json to $v2"; sed -i '' -E '1,/version":.*/s/version":.*/version": "'$v2'",/' package.json; fi); done
    # update the nested test
    for l in $ACTIVE; do ( cd $l; v="$(grep version= plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; vt="$(grep version= tests/plugin.xml | grep -v xml | head -n1 | cut -d'"' -f2)"; if [ "$v" != "$vt" ]; then echo "$l: Setting version to $v"; sed -i '' -E s:"version=\"$vt\":version=\"$v\":" tests/plugin.xml; fi); done
    for l in $ACTIVE; do (cd $l; git commit -am "$JIRA Incremented plugin version." ); done

## Push tags and changes
    # Sanity check:
    coho repo-status -r plugins
    coho foreach -r plugins "git status -s"
    # Push: (assumes "origin" is apache remote)
    for l in $ACTIVE; do ( cd $l; tag=$(git describe --tags --abbrev=0); echo $l; set -x; git push origin master && git push origin refs/tags/$tag); done
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
 * Combine highlights from RELEASENOTES.md into a Release Announcement blog post
   * Instructions on [sites page README](https://svn.apache.org/repos/asf/cordova/site/README.md)
 * Get blog post proof-read.

To extract changes from RELEASENOTES.md:

    for l in $ACTIVE; do ( cd $l; id="$(grep id= plugin.xml | grep -v xml | grep -v engine | grep -v param | head -1 | cut -d'"' -f2)"; v="$(git describe --tags --abbrev=0)"; echo $id@${v:1}; awk "{ if (p) print } /$DATE/ { p = 1 } " < RELEASENOTES.md; echo); done

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

    Upon a successful vote I will upload the archives to dist/, upload them to the Plugins Registry, and post the corresponding blog post.

    Voting guidelines: https://github.com/apache/cordova-coho/blob/master/docs/release-voting.md

    Voting will go on for a minimum of 48 hours.

    I vote +1:
    * Ran coho audit-license-headers over the relevant repos
    * Ran coho check-license to ensure all dependencies and subdependencies have Apache-compatible licenses
    * Ensured continuous build was green when repos were tagged


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

_Note: list of PMC members: http://people.apache.org/committers-by-project.html#cordova-pmc_

## If the Vote does *not* Pass
* Revert adding of `-dev` on master branch
* Address the concerns (on master branch)
* Re-tag release using `git tag -f`
* Add back `-dev`
* Start a new vote


## Publish to dist/

If you've lost your list of ACTIVE:

    TODO: As soon as plugins use tgz, update zip->tgz here.
    ACTIVE=$(cd cordova-dist-dev/$JIRA; ls *.zip | sed -E 's:-[^-]*$::')

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

## Publish to Plugins Registry

Unzip the voted content to a temporary location and publish with that:

    cd cordova-dist/plugins
    for l in $ACTIVE; do (
        set -e; set -x
        rm -rf tmp_publish; mkdir tmp_publish; cd tmp_publish
        # TODO: As soon as plugins use tgz, update unzip -> tar xzf
        unzip ../$l-r*.zip > /dev/null
        cd $l; plugman publish .
    ) done;


## Post blog Post

See [full instructions](http://svn.apache.org/viewvc/cordova/site/README.md?view=markup).

    cd cordova-website
    svn update
    cd apache-blog-posts
    git pull
    cd ..
    grunt updateBlog
    rake build
    # correct any build errors, and repeat until clean run
    rake serve
    # preview contents at localhost:4000 and repeat until satisfied
    (cd apache-blog-posts && git add . && git commit)
    svn status
    svn add NEW_FILES_HERE
    # commit the new and modified files
    svn commit

## Do other announcements

    Do the same things regarding announcements as described in cadence-release-process, where they make sense.

## Close JIRA Issue
 * Double check that the issue has comments that record the steps you took
 * Mark it as fixed

## Finally:

 * Update *these instructions* if they were missing anything.

