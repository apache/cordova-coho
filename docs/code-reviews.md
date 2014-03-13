# Code Reviews

TODO: Review Board didn't really work out :(. Come up with something better.

 * Use http://reviews.apache.org/ to create a review request.
   * You will need a Review Board userid and password. One can be requested from the site.
   * By default, the ML will be notified of your review request.
   * If you have someone in particular that you would like approval from, be sure to add them in "People" field of the review.
   * To create your review request is to use [post-review](http://www.reviewboard.org/docs/rbtools/dev/) (RBTools) from the repo with the change, only if the repo contains the file '.reviewboardrc'
     Currently the following repos contain .reviewboardrc:
     cordova-coho
     cordova-cli
     cordova-android
     cordova-ios
     cordova-js

   * If you don't want to use post-review tool, then on the web site:
     * Click "New Review Request"
     * On your workstation do a git diff and pipe the output to a file. In the new request, select the git repo, the base dir where you did the diff, upload the diff file you created, and click Create.
     * On the next web page, fill in the description text, the name of the Branch (i.e., "master"), the Bug (i.e., "CB-4960"), the Description and the Testing Done fields. If you want a review from a specific person, enter their userid / name in the People field. If you want input from the whole community, enter "cordova" in the Groups field. Click the Submit button.
   * After you have received sufficient feedback, click the button to mark your review as Discarded or Submitted [to a stream].
   * If you don't want to use ReviewBoard you can use Github Pull Request
