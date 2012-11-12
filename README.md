COHO
=======

Coho is a script that automates the process for building releases of the Apache Cordova source code.

Prerequisites
-------------
 - Must be run on a Mac with Lion (or later) installed
 - Have node installed (v 6.6+)
 - Must have git setup
 - Install gpg
	- Create a keypair if you don't have one already that can be used to 
	sign the release artifact.

Usage
-----
*	`./coho all 2.2.0 2.1.0`

	where 'all' is the commands to run, '2.2.0' is the current version to release,
	and '2.1.0' is the previous version that will be diff'ed to
	create a changelog using `git history`. Specifying the previous version
	is optional, if you omit it a changelog will not be generated.
	Running coho will do a `git checkout` of the tagged
	specified release version (ie, '2.2.0'). Running coho will also create
	the `temp/release/src` directory which is where the generated artifact
	will be when coho completes.
	
	Other commands to run:
	
	`./coho build 2.2.0 2.1.0`
	builds the release without zipping + signing.
	
	`./coho sign 2.2.0 2.1.0`
	will take a built release and zip + sign it. Must run `build` before running `sign`. 
	
*	`make` OR `npm test`

	runs `coho all 2.2.0 2.1.0` and the unit tests to verify the
	packaging of the artifact. You may need to run `npm install` to 
	install coffee-script and nodeunit if you wish to run this. You 
	will probably want to change the release version 'VERSION' and the 
	previous version 'OLDVER' variables at the top of the 
	`test/tests.coffee` script from the default values of '2.2.0' and
	'2.1.0' respectively.

Issues
------

Please file all issues at <https://issues.apache.org/jira/browse/CB>.
