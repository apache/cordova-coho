COHO
=======

Coho is a script that contains commands that make it easier to work with Cordova's many repositories.

Prerequisites
-------------
 - Have node installed
 - Must have git setup
 - Must install node dependencies via `npm install`

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

