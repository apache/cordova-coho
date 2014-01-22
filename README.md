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

Suggested way to install `node` is to use `nvm`:

    curl https://raw.github.com/creationix/nvm/master/install.sh | sh
    source ~/.bash_profile
    nvm install 0.10
    nvm alias default 0.10

Getting Coho
------------

    mkdir cordova && cd cordova && git clone https://git-wip-us.apache.org/repos/asf/cordova-coho.git

Usage
-----
`./coho --help`

Examples
--------
`./cordova-coho/coho repo-clone -r plugins -r mobile-spec -r android -r ios -r cli`

`./cordova-coho/coho repo-update -r auto`

`./cordova-coho/coho foreach -r plugins "git checkout master"`

`./cordova-coho/coho foreach -r plugins "git clean -fd"`

`./cordova-coho/coho list-repos`

`./cordova-coho/coho last-week --me`

