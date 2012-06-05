COHO
=======

Coho is a script that automates the release process for building Apache Cordova releases.

Prerequisites
-------------
 - Must be run on a Mac with Lion installed
 - Have node installed (v 6.6+)
 - Must have git setup 
 - Install joDoc
	- Have perl 5.8+
	- Clone [joDoc](http://github.com/davebalmer/jodoc)

	        git clone http://github.com/davebalmer/joDoc.git

	- Add joDoc/ to your path

	  Open `~/.bashrc` or `~/.profile` (or whatever you use)

	        export PATH=$PATH:~/path/to/joDoc/

	- Install markdown

	        # Use your package manager
	        brew install markdown
	        port install markdown
	        aptitude install markdown

	- Install nokogiri (Ruby HTML parser)

	        gem install nokogiri

	- Install json (Ruby JSON parser)

	        gem install json
- Install android 
- Install gpg

Usage
-----
	coho all 1.8.0 1.7.0
   	// creates temp/release directory which contains bin folder, changelog, doc folder, KEYS, and src folder.
	
	make
	// runs coho 1.8.0 1.3.0 and the unit tests
	

Issues
------

Please file all issues at https://issues.apache.org/jira/browse/CB