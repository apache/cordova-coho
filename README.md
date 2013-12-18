COHO
=======

Coho is a script that contains commands that make it easier to work with Cordova's many repositories.

Prerequisites
-------------
 - Have node installed
 - Must have git setup
 - Must install node dependencies via `npm install`

If you get the error:
    Error: Cannot find module 'optimist'
then you haven't run `npm install` yet.

Getting Coho
------------

    mkdir cordova && cd cordova && git clone https://git-wip-us.apache.org/repos/asf/cordova-coho.git

Usage
-----
`./coho --help`

Examples
--------
`./coho repo-clone -r plugins -r mobile-spec -r android -r ios -r cli`

`./coho repo-update -r auto`

`./coho foreach -r plugins "git checkout master"`

`./coho foreach -r plugins "git clean -fd"`

`./coho list-repos`

`./coho last-week --me`

