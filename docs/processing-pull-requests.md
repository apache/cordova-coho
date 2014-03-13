# Processing Pull Requests

## Prerequisites:
 * Ensure you are familiar with [committer-workflow.md](committer-workflow.md)

## Step 0:
 * Find what requests need attention by looking a the GitHub page.
 * To look at them in aggregate:


    ./cordova-coho/coho list-pulls | tee pulls.list | less -R

 * To filter out those that you last commented on:


    ./cordova-coho/coho list-pulls --hide-user=agrieve

 * To show only certain repos:


    ./cordova-coho/coho list-pulls -r js -r android -r plugin-inappbrowser

## Step 1: Review the change (part 1)
 * Ensure that we actually want the change (if unsure, bring it up on the ML)
 * If there is no JIRA issue for the change, create one
   * Ensure the JIRA issue has a link to the pull request
   * Ensure the pull request has a link to the JIRA issue
 * View the user's branch in github and request changes be made (if applicable) by adding comments in the web interface

## Step 2: Ensure they have signed the Contributor Agreement
 * For trivial changes, this is not necessary
 * Find their name on: https://people.apache.org/committer-index.html#unlistedclas
 * If it is not there, respond with:

_Thanks for the pull request. I've had a look at it and think it looks good. Before we can merge it though, you need to sign Apache's Contributor License Agreement (can be done online):  http://www.apache.org/licenses/#clas_
   
## Step 3: Merge the change
Run the following as an exemplary way to merge to master:

    git pull https://github.com/GitHubUser/cordova-FOO BRANCH
    git rebase origin/MASTER_OR_DEV -i

The rebase step will let you interactively review the changes being made to master. You should:

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

