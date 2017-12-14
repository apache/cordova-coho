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

# Processing Pull Requests

For a visual walkthrough, see slides from ApacheCon 2015 talk on [Committer Tools](http://goo.gl/ciGnaR).

## Prerequisites:
 * Ensure you are familiar with [committer-workflow.md](committer-workflow.md)

## Step 0:
Find what requests need attention by looking at the GitHub page.

To look at them in aggregate:

    coho list-pulls | tee pulls.list | less -R

Alternatively, you can navigate to http://s.apache.org/cordovaPulls to see all PRs for Cordova repos.

To filter out those that you last commented on:

    coho list-pulls --hide-user=agrieve

To show only certain repos:

    coho list-pulls -r js -r android -r plugin-inappbrowser

### Stale Pull Requests

To close a pull request that is no longer relevant / active:

 * Create an empty commit in the repo of the pull request via:
   * `git commit --allow-empty -m "Closing stale pull request: close #99"

## Step 1: Review the change (part 1)
 * Ensure that we actually want the change (if unsure, bring it up on the ML)
 * If there is no JIRA issue for the change, create one
   * Ensure the JIRA issue has a link to the pull request
   * Ensure the pull request has a link to the JIRA issue
 * View the user's branch in GitHub and request changes be made (if applicable) by adding comments in the web interface

## Step 2: Ensure they have signed the Contributor Agreement
 * For trivial changes, this is not necessary (e.g. use your judgement - e.g. less than 100 lines of code)
 * Find their name on: http://home.apache.org/unlistedclas.html
 * If it is not there, respond with:

_Thanks for the pull request. I've had a look at it and think it looks good. Before we can merge it though, you need to sign Apache's Contributor License Agreement (can be done online):  http://www.apache.org/licenses/#clas_

## Step 3: Merge the change
Run the following as an exemplary way to merge to master:

    coho merge-pr --pr <pr#>
    
This command will do the following:
* Update your local master.
* Fetch the PR and create a branch named `pr/pr#`
* Attempt a `--ff-only` merge to master. If this fails, then: 
    * Perform a rebase of the `pr/pr#` branch.
    * Attempt a `--ff-only` merge to master. 
    * On success, it will modify the last commit's message to include. 'This closes #pr' to ensure the corresponding PR closes on pushing to remote.

You should:
 * Squash as many commits as is reasonable together.
 * Re-write commit messages to include JIRA issue numbers in the form CB-#### (no "[]"'s, no ":")
 * In the final commit message (if there are multiple), [tell GitHub to close the pull request](https://help.github.com/articles/closing-issues-via-commit-messages)

Example:

    CB-6124 Make `cordova plugin remove` resilient to a missing plugin directory

    This breaks a couple prepare tests that Andrew deletes in the next commit.

    github: close #57

## Step 4: Check the author

Git keeps track of the author of commits separately from the committer of the commit.

Typically, both of these values are set to the person submitting the pull request.
After your pull/merge/rebase/whatever work, you may find the values have changed - or not.
What we would typically be looking for is the final commit to have YOU as the committer and the original author as the author.

You can check these fields with the following command:

    git log --pretty=full

If the author is set to YOU, and you'd like to reset it to the original author, you can amend the commit:

    git commit --amend --author=some_author_id_here

## Step 5: Review the change (part 2)
 * You are responsible for testing the changes that push.
   * Refer to [committer-workflow.md](committer-workflow.md) for how to test each repo.
 * If it would be appropriate to write a test
   * Either write one yourself, or ask the author to do so.
   * If you write one yourself, commit it in a follow-up (don't squash it with theirs)

## Step 6: Push the change

    git push

## Step 7: Update JIRA
 * Same as you would as if you authored the change.

## Step 8: Final details
 * The commit will get attached to the pull request automatically from the "closes #" in the commit message.
 * If you haven't done so already, thank them for their contribution via a pull request comment :).

