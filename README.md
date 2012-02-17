COHO
=======

Coho is a script that automates the release process for building PhoneGap releases. Future releases will hopefully be able to build official Cordova releases.

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
	coho 1.4.0
   	// creates phonegap-1.4.0.zip

	coho 1.4.0 1.3.0
	// creates phonegap-1.4.0.zip with the changes made since 1.3.0
	
	make
	// runs coho 1.4.0 1.3.0 and the unit tests
	


Manual Process
--------------

1. create directory structure
2. download repositories
3. run build scripts
4. copy necessary files into release folder
5. generate changelog
6. zip release folder


iOS
 - Pull tagged version of cordova-ios 
 - Check if version file is up to date
 - CD into cordova-ios and run make on a Lion machine
 - Copy DMG file from dist folder into iOS release folder

Android
 - Pull tagged version of cordova-android
 - Check if version file is up to date
 - CD into directory and run create command
 - CD into example/libs, copy phonegap-1.3.0.jar into android release folder
 - CD into example/assets/www/, copy phonegap-1.3.0.js into android release folder
 - CD into example/res, copy xml folder into android release folder
 - Make sure index.html in example/assets/www is correctly referencing phonegap-1.3.0.js
 - Copy example folder into android release folder

BlackBerry
 - Pull tagged version of cordova-blackberry
 - Check if version file is up to date
 - CD into cordova-blackberry and run ant dist
 - Copy contents of dist directory to blackberry release folder
 
Windows Phone
 - Pull tagged version of cordova-windows-phone
 - Copy contents of cordova-windows-phone into windows phone release directory

Bada
 - Pull tagged version of cordova-bada 
 - Check if version file is up to date
 - Copy contents of cordova-bada to bada release folder

WebOS
 - Pull tagged version of cordova-webos
 - Check if version file is up to date
 - Copy contents of cordova-web0s to webOS release folder 

Symbian (Has been deprecated)
 - Pull tagged version of cordova-symbian
 - Check if version file is up to date
 - Copy contents of cordova-symbian to symbian release folder


Docs
 - Pull tagged version of cordova-docs
 - CD phonegap-docs and run command ./bin/phonegap-docs
 - Copy contents of Public folder into docs release folder

Issues
------

Please file all issues at https://github.com/stevengill/coho/issues