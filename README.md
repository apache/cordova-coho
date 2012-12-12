COHO
=======

Coho is a script that automates the process for building releases of the Apache Cordova source code.

Prerequisites
-------------
 - Must be run on a Mac with Lion (or later) installed
 - Have node installed (v 6.6+)
 - Must have git setup
 - Install joDoc
	- Have perl 5.8+ installed
	- Clone [joDoc](http://github.com/davebalmer/jodoc)

	        git clone http://github.com/davebalmer/joDoc.git

	- Add `joDoc/` to your path:

	  Open `~/.bashrc` or `~/.profile` (or whatever you use) and

	        export PATH=$PATH:~/path/to/joDoc/

	- Install markdown:

	        # Use your package manager such as:
	        brew install markdown
	        port install markdown
	        aptitude install markdown

	- Install nokogiri (Ruby HTML parser):

	        gem install nokogiri

	- Install json (Ruby JSON parser):

	        gem install json
 - Install Android SDK
 - Install gpg

	- Create a keypair if you don't have one already that can be used to 
	sign the release artifact.

Usage
-----
*	`./coho all 1.8.0 1.7.0`

	where 'all' is the platforms to include, '1.8.0' is the current version
        to release, and '1.7.0' is the previous version that will be diff'ed to
	create a changelog using `git history`. Specifying the previous version
	is optional, if you omit it a changelog will not be generated.
	Running coho will do a `git checkout` of the tagged
	specified release version (ie, '1.8.0'). Running coho will also create
	the `temp/release/src` directory which is where the generated artifact
	will be when coho completes.
	
*	`make`

	runs `coho all 1.8.0 1.7.0` and the unit tests to verify the
	packaging of the artifact. You may need to
	npm install coffee-script and nodeunit if you wish to run this. You 
	will probably want to change the release version 'VERSION' and the
 	previous version 'oldVersion' variables at the top of the 
	`test/tests.coffee` script from the default values of '1.8.0' and
	'1.7.0' respectively.

Issues
------

Please file all issues at <https://issues.apache.org/jira/browse/CB>.
