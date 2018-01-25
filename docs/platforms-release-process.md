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

This page describes the technical steps for releasing a `Platforms Release`.

It describes the following steps:

- Get Buy-in
- Creating JIRA issues
- Update and Pin Dependencies
- Release Check
- Prepare Release
- Testing
    - What to test
        - Android Extras
        - iOS Extras
- Push Changes
- Publish RC to dist/dev
- Documentation to Update
- Prepare Blog Post
- Start VOTE Thread
- Email the result of the vote
- If the Vote does *not* Pass
- Otherwise: Publish to dist/ & npm
- Uploading to Bintray (Android only)
- Add permanent apache release tag
- Details
    - Tell Apache about Release
    - Update the Docs
    - Announce It!
- Additional Information
    - Moving Tags

(Yes this list is long and scary, but represents the content below)

> See: [versioning-and-release-strategy.md](versioning-and-release-strategy.md) for general versioning information
>
> Before cutting any releases, read the Apache's [Releases Policy](http://www.apache.org/dev/release)

TODO: We may want to be using [signed tags](http://git-scm.com/book/en/Git-Basics-Tagging), or at least annotated tags.

Replace `Android` with the platform you are releasing.

## Get Buy-in

Email the dev mailing-list at dev@cordova.apache.org and see if anyone has reason to postpone the release.

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

## Update and Pin Dependencies
Ensure you're up-to-date:

    coho repo-update -r android

See if any dependencies are outdated

    (cd cordova-android && npm outdated --depth=0)

Update them in each project's `package.json` file. Make sure to run through the test section below for compatibility issues. The `--depth=0` prevents from listing dependencies of dependencies.

Check-in updated modules (use npm 3.10.1+)

    rm -rf node_modules
    npm install --production (skips devDependencies)
    git add node_modules/* (check-in all modules needed for platform add git url)
    git commit -m "$JIRA Updated checked-in node_modules"
    npm install (Re-add devDependencies for ability to run tests locally)

Note: This will commit these changes directly to the `master` branch of the platform you are working on. This is intended.

## Release Check

Ensure license headers are present everywhere. For reference, see this [background](http://www.apache.org/legal/src-headers.html). Expect some noise in the output, for example some files from test fixtures will show up.

    coho audit-license-headers -r android | less

Ensure all dependencies and subdependencies have Apache-compatible licenses.

    coho check-license -r android

## Prepare Release
Increase the version within package.json using SemVer, and remove the `-dev` suffix.

    for l in cordova-android; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v = *-dev ]]; then v2="${v%-dev}"; echo "$l: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi) ; done

In `cordova-android`, also remember to bump the version in `framework/build.gradle`.

If the changes merit it, manually bump the major / minor/ patch version in `package.json`. View the changes via:

    ( cd cordova-android && git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags $(git rev-list --tags --max-count=1))..master )

Update the repos `RELEASENOTES.md` file with changes since the last release.

    coho update-release-notes -r android
    # Then curate:
    vim cordova-android/RELEASENOTES.md

Commit these changes together into one commit.

    (cd cordova-android && v="$(grep '"version"' package.json | cut -d'"' -f4)" && git commit -am "$JIRA Updated RELEASENOTES and Version for release $v")

---

**PATCH RELEASE NOTES**


If you have prepared the release notes in your release branch for a patch release, you will have to cherry-pick the RELEASENOTES only into your master branch as well (stage only the appropriate chunk).

    git checkout master
    git checkout -p RELEASENOTES_COMMIT_SHA_HASH

For iOS, you may have to cherry-pick the commit for `Added X.Y.Z to CDVAvailability.h (via coho)` into the master branch as well.

---

If you are releasing new commits from an already-existing release branch, remember to merge in or cherry-pick relevant commits from master into the release branch!

After, prepare your release branch by using `coho prepare-release-branch` command, which handles the following steps:
 * Updating `cordova.js` snapshot
 * Creating a release branch (if it doesn't already exist)
 * Updating version numbers (`VERSION` file & package.json). On `master`, it gives version a minor bump and adds `-dev`


Run the following command (make sure to replace the version below with what is listed inside `package.json`).

    coho prepare-platform-release-branch --version 5.0.0 -r android
    # Ensure commits look okay on both branches
    coho repo-status -r android -b master -b 5.0.x

## Testing

Once all the repos are branched, we focus on testing & fixing all of the regressions we find.

When a regression is found:

 * Create a JIRA issue for it, and mark it as a blocker.

To submit a fix:

    git checkout master
    git commit -am 'Your commit message'
    git push origin master
    git log     # note the first five or six digits of the commit hash
    git checkout 5.0.x
    git cherry-pick -x commit_hash
    git push origin 5.0.x

### What to Test

1) Run [mobile-spec](http://git-wip-us.apache.org/repos/asf/cordova-mobile-spec.git). Don't forget to run through the manual tests in addition to the automatic tests.

    ```
    ./cordova-mobile-spec/createmobilespec/createmobilespec.js --android --forceplugins
    (cd mobilespec && cordova run android --device)
    (cd mobilespec && cordova run android --emulator)
    ```

2) Create a hello world app using the cordova CLI.

    ```
    cordova create ./androidTest org.apache.cordova.test androidTest
    (cd androidTest && cordova platform add ../cordova-android)
    (cd androidTest && cordova run android --device)
    (cd androidTest && cordova run android --emulator)
    ```

3) Run your platform's `./bin/create` script. Ensure the generated project builds & runs both through an IDE and through the cordova/* scripts.


    ```
    ./cordova-android/bin/create ./androidTest2 org.apache.cordova.test2 androidTest2
    (cd androidTest2 && ./cordova/build)
    (cd androidTest2 && ./cordova/run --device)
    (cd androidTest2 && ./cordova/run --emulator)
    ```

The output from `./cordova/version` should show the new version of `cordova-android`.

 4) Run cordova-lib tests.

    ```
    (cd cordova-lib/cordova-lib && npm test)
    ```

Feel free to clean up the projects you just created.

    ```
    rm -rf androidTest*
    ```

#### Android Extras

 * Unit tests in: [test](https://github.com/apache/incubator-cordova-android/tree/master/test) directory

#### iOS Extras

 * Unit tests in: [CordovaLibTests/CordovaTests.xcodeproj](https://git-wip-us.apache.org/repos/asf?p=cordova-ios.git;a=tree;f=CordovaLibTests;h=88ba8e3c286159151b378efb1b0c39ef26dac550;hb=HEAD)
 * Test the Makefile via `make`

## Push Changes:

    coho repo-status -r android -b master -b 5.0.x
    # If changes look right:
    coho repo-push -r android -b master -b 5.0.x

Tag & Push:

    coho tag-platform-release --version 3.5.0 -r android --pretend
    # Seems okay:
    coho tag-platform-release --version 3.5.0 -r android

The `coho tag-release` command also tags `cordova-js` with `android-5.0.0` and pushes it.

## Publish RC to dist/dev
Ensure you have the svn repos checked out:

    coho repo-clone -r dist -r dist/dev

Create archives from your tags:

    coho create-archive -r android --dest cordova-dist-dev/$JIRA --tag 3.5.0

Sanity Check:

    coho verify-archive cordova-dist-dev/$JIRA/*.tgz

Upload:

    (cd cordova-dist-dev && svn add $JIRA && svn commit -m "$JIRA Uploading release candidates for android release")

Find your release here: https://dist.apache.org/repos/dist/dev/cordova/

## Documentation To Update

For your platform:
 1. Ensure the [Upgrade Guide](http://cordova.apache.org/docs/en/latest/guide/platforms/android/upgrade.html) for your platform is up-to-date
 2. Ensure the other guides listed in the sidebar are up-to-date for your platform

## Prepare Blog Post
 * Gather highlights from RELEASENOTES.md into a Release Announcement blog post
 * Instructions on publishing a blog post are on the [cordova-docs repo](https://github.com/apache/cordova-docs#writing-a-blog-post)
 * Get blog post proofread by submitting a PR to cordova-docs and asking someone on dev list to +1 it.

## Start VOTE Thread
Send an email to dev ML with: (replace `android` with your platform)

__Subject:__

    [Vote] 5.0.0 Android Release

__Body:__

    Please review and vote on this 5.0.0 Android Release
    by replying to this email (and keep discussion on the DISCUSS thread)

    Release issue: https://issues.apache.org/jira/browse/CB-XXXX

    The archive has been published to dist/dev:
    https://dist.apache.org/repos/dist/dev/cordova/CB-XXXX

    The package was published from its corresponding git tag:
    PASTE OUTPUT OF: coho print-tags -r android --tag 5.0.0

    Note that you can test it out via:

        cordova platform add https://github.com/apache/cordova-android#5.0.0

    Upon a successful vote I will upload the archive to dist/, publish it to npm, and post the blog post.

    Voting guidelines: https://github.com/apache/cordova-coho/blob/master/docs/release-voting.md

    Voting will go on for a minimum of 48 hours.

    I vote +1:
    * Ran coho audit-license-headers over the relevant repos
    * Ran coho check-license to ensure all dependencies and subdependencies have Apache-compatible licenses
    * Ensured continuous build was green when repo was tagged


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

(replace `android` with your platform)

    cd cordova-dist
    svn up
    svn rm platforms/cordova-android*
    cp ../cordova-dist-dev/$JIRA/cordova-android* platforms/
    svn add platforms/cordova-android*
    svn commit -m "$JIRA Published android release to dist"
    npm publish platforms/cordova-android-3.5.0.tgz

    cd ../cordova-dist-dev
    svn up
    svn rm $JIRA
    svn commit -m "$JIRA Removing release candidates from dist/dev"
    cd ..


Find your release here: https://dist.apache.org/repos/dist/release/cordova/

## Uploading to Bintray (Android only)

1. Add the cordova bintray username and API key as system variables. Your `BINTRAY_USER` should be the username "cordova". The API key is available on the [bintray cordova "edit profile" page](https://bintray.com/profile/edit) - the last option in the menu on the left is "API Key". Find it there. [Credentials to log into the bintray site are on the PMC private SVN](https://svn.apache.org/repos/private/pmc/cordova/logins/bintray.txt). If you have trouble, ask the Project Management Committee (pmc) for the credentials. Confirm that your key and user name are set:

```
    echo $BINTRAY_USER
    echo $BINTRAY_KEY
```

2. Run the following command (replace 6.2.2 with released version):

```
    (cd cordova-android/framework && git checkout 6.2.2 && gradle bintrayUpload)

```

3. Load up the bintray webpage for cordova-android: https://bintray.com/cordova/maven/cordova-android. You should see a notification/warning about publishing the latest release. Hit the Publish link!

## Add permanent apache release tag

Make a copy of your released tag with a prefix of `rel/YOURTAG`. These are permanent release tags for Apache.

    (cd cordova-android; git checkout 5.1.0; git tag rel/5.1.0; git push origin --tags; git checkout master)

##  Details

### Tell Apache about Release

1. Go to: https://reporter.apache.org/addrelease.html?cordova
2. Use version "cordova-$PLATFORM@x.x.x"

### Update the Docs

Follow the README at https://github.com/apache/cordova-docs, and specifically the deploy section: https://github.com/apache/cordova-docs#deploying

### Announce It!
 1. Announce the release to the world!
   * Create a blog post for it (instructions on [sites page README](https://svn.apache.org/repos/asf/cordova/site/README.md))
   * Tweet it on https://twitter.com/apachecordova

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
    $ git push origin 3.1.0 && git push origin refs/tags/3.1.0
    Total 0 (delta 0), reused 0 (delta 0)
    To https://git-wip-us.apache.org/repos/asf/cordova-docs.git
     * [new tag]         3.1.0 -> 3.1.0
    git commit --allow-empty -m "empty commit to update tag on github mirror"
    git push origin

Then send a note to the mailing list:

    To verify you have the updated tag in your local clone, doing a "git rev-parse 3.1.0" in cordova-docs should reply with "7cf9fea03d7d02a13aef97a09a459e8128bd3198". If it is wrong, do "git fetch --tags".

