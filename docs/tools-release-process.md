# Release Process for ''Plugman and CLI''

Before cutting any releases, read the Apache's [Releases Policy](http://www.apache.org/dev/release)

If you have not done so already, create a GPG key (see: [setting-up-gpg.md](setting-up-gpg.md)).

Plugman and CLI are released at most weekly (see: [versioning-and-release-strategy.md](versioning-and-release-strategy.md)).

A tools release is performed by a single person each week. We call this person the "Release Manager". How to select the Release Manager is still TDB.

TODO: add in RAT instruction (via coho) for next release

TODO: use npm pack instead of git archive.

TODO: Use perl instead of sed in these commands so they work on Linux.

TODO: We may want to be using [signed tags](http://git-scm.com/book/en/Git-Basics-Tagging), or at least annotated tags.

TODO: Should publish to npm under RC version numbers (and remove the RC afterwards).

## Get Buy-in

Email the dev mailing-list and see if anyone has reason to postpone the release.
 * If so, agree upon a branching date / time.

## Create JIRA issues

 * Create a JIRA issue to track the status of the release.
   * Make it of type "Task"
   * Title should be "Tools Release _Feb 2, 2014_"
   * Description should be: "Following steps at https://github.com/apache/cordova-coho/blob/master/docs/tools-release-process.md"
 * Comments should be added to this bug after each top-level step below is taken
 * Set a variable for use later on:


    JIRA="CB-????" # Set this to the release bug.

## Test
Ensure license headers are present everywhere:

    ./cordova-coho/coho audit-license-headers -r cli | less
    ./cordova-coho/coho audit-license-headers -r plugman | less

Ensure you're up-to-date:

    ./cordova-coho/coho repo-update -r cli -r plugman
    (cd cordova-plugman && npm install)
    (cd cordova-cli && npm install)
    (cd cordova-cli && npm install ../cordova-plugman)

Ensure that mobilespec creates okay via CLI:

    cordova-mobile-spec/createmobilespec.sh
    (cd mobilespec && cordova run android)

Ensure uninstall doesn't cause errors:

    cordova plugin remove org.cordova.mobile-spec-dependencies

Ensure that mobilespec creates okay via plugman:

    cordova-mobile-spec/createmobilespecandroid-usingplugman.sh
    (cd mobilespec-android && cordova/run)

Ensure unit tests pass:

    (cd cordova-plugman; npm test)
    (cd cordova-cli; npm test)

Add a comment to the JIRA issue stating what you tested, and what the results were.

## Update Release Notes & Version

Increase the version within package.json using SemVer, and remove the ''-dev'' suffix

    for l in cordova-plugman cordova-cli; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v = *-dev ]]; then v2="${v%-dev}"; echo "$l: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi) ; done

If the changes merit it, manually bump the major / minor version instead of the micro. List the changes via:

    ( cd cordova-plugman; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master | grep -v "Incremented plugin version" )


    ( cd cordova-cli; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master | grep -v "Incremented plugin version" )


Update each repo's RELEASENOTES.md file with changes

    # Add new heading to release notes with version and date
    DATE=$(date "+%h %d, %Y")
    for l in cordova-plugman cordova-cli; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; echo -e "\n### $v ($DATE)" >> RELEASENOTES.md; git log --pretty=format:'* %s' --topo-order --no-merges $(git describe --tags --abbrev=0)..master | grep -v "Incremented plugin version" >> RELEASENOTES.md); done
    # Then curate:
    vim cordova-cli/RELEASENOTES.md cordova-plugman/RELEASENOTES.md

Update the version of plugman that CLI depends on:

    v="$(grep '"version"' cordova-plugman/package.json | cut -d'"' -f4)"
    sed -i '' -E 's/"plugman":.*/"plugman": "'$v'",/' cordova-cli/package.json

Update CLI's npm-shrinkwrap.json with new version of plugman:

    (cd cordova-cli; npm shrinkwrap)

Commit these three changes together into one commit

    for l in cordova-plugman cordova-cli; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git commit -am "$JIRA Updated version and RELEASENOTES.md for release $v" ); done

## Tag

    # Review commits:
    for l in cordova-plugman cordova-cli; do ( cd $l; git log -p origin/master..master ); done  
    # Tag
    for l in cordova-plugman cordova-cli; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; git tag $v ); done

## Re-introduce -dev suffix to versions

    for l in cordova-plugman cordova-cli; do ( cd $l; v="$(grep '"version"' package.json | cut -d'"' -f4)"; if [[ $v != *-dev ]]; then v2="$(echo $v|awk -F"." '{$NF+=1}{print $0RT}' OFS="." ORS="")-dev"; echo "$l: Setting version to $v2"; sed -i '' -E 's/version":.*/version": "'$v2'",/' package.json; fi); done
    for l in cordova-plugman cordova-cli; do (cd $l; git commit -am "$JIRA Incremented package version to -dev"; git show ); done


## Push

    # Push
    for l in cordova-plugman cordova-cli; do ( cd $l; git push && git push --tags ); done

If the push fails due to not being fully up-to-date, either:
1. Pull in new changes via `git pull --rebase`, and include them in the release notes / re-tag
2. Pull in new changes via `git pull`, and do *not* include them in the release.

## Publish to dist/dev
Ensure you have the svn repos checked out:

    ./cordova-coho/coho repo-clone -r dist -r dist/dev

Create archives from your tags:

    ./cordova-coho/coho create-archive -r plugman -r cli --dest cordova-dist-dev/$JIRA

Sanity Check:

    ./cordova-coho/coho verify-archive cordova-dist-dev/$JIRA/*.zip

Upload:

    (cd cordova-dist-dev && svn add $JIRA && svn commit -m "$JIRA Uploading release candidates for tools release")

Find your release here: https://dist.apache.org/repos/dist/dev/cordova/


## Prepare Blog Post
 * Combine highlights from RELEASENOTES.md into a Release Announcement blog post
   * Instructions on [sites page README](https://svn.apache.org/repos/asf/cordova/site/README.md)
 * Get blog post proofread.

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
    PASTE OUTPUT OF: ./cordova-coho/coho print-tags -r plugman -r cli

    Upon a successful vote I will upload the archives to dist/, publish them to NPM, and post the corresponding blog post.

    Voting will go on for a minimum of 48 hours.

    I vote +1.


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
    
    git checkout THEVERSIONTAG
    npm publish cordova-cli
    git checkout THEVERSIONTAG
    npm publish plugman


## Post Blog Post

    cd cordova-website
    rake build
    svn st
    svn add blah.blah.blah
    svn commit -m "$JIRA Published blog post for tools release."


## Close JIRA Issue
 * Double check that the issue has comments that record the steps you took
 * Mark it as fixed

## Finally:

 * Update *these instructions* if they were missing anything.

