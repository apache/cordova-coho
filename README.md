Cordova
=======

These are documenting the manual steps required to make Cordova/PhoneGap Release. Our goal is to automate these as much as possible.

Perquisites
===========
 - Must be run on a Mac with Lion installed
 - Must have joDoc installed
 - Must have git setup

Usage
=====

	coho 1.3.0
   	// creates phonegap-1.3.0.zip

	coho 1.3.0 1.2.0
	// creates phonegap-1.3.0.zip with the changes made since 1.2.0
	


### the process


1. create a directory
2. download the shit


iOS
===
 - Pull tagged version of cordova-ios 
 - Check if version file is up to date
 - CD into cordova-ios and run make on a Lion machine
 - Copy DMG file from dist folder into iOS release folder


Android
=======
 - Pull tagged version of cordova-android
 - Check if version file is up to date
 - CD into directory and run create command
 - CD into example/libs, copy phonegap-1.3.0.jar into android release folder
 - CD into example/assets/www/, copy phonegap-1.3.0.js into android release folder
 - CD into example/res, copy xml folder into android release folder
 - Make sure index.html in example/assets/www is correctly referencing phonegap-1.3.0.js
 - Copy example folder into android release folder


BlackBerry
==========
 - Pull tagged version of cordova-blackberry
 - Check if version file is up to date
 - CD into cordova-blackberry and run ant dist
 - Copy contents of dist directory to blackberry release folder
 
Windows Phone
=============
 - Pull tagged version of cordova-windows-phone
 - Copy contents of cordova-windows-phone into windows phone release directory

Bada
====
 - Pull tagged version of cordova-bada 
 - Check if version file is up to date
 - Copy contents of cordova-bada to bada release folder


WebOS
=====
 - Pull tagged version of cordova-webos
 - Check if version file is up to date
 - Copy contents of cordova-web0s to webOS release folder 


Symbian
=======
 - Pull tagged version of cordova-symbian
 - Check if version file is up to date
 - Copy contents of cordova-symbian to symbian release folder


Docs
====
 - Pull tagged version of cordova-docs
 - CD phonegap-docs and run command ./bin/phonegap-docs
 - Copy contents of Public folder into docs release folder

Issues & Concerns
=================
 - Every project needs to have a VERSION file in it to double check the tagged version (Currently missing in windows-phone and docs). Failing tests are expected.
 - Currently using callback repo for files. Need to switch this to apache git servers but need all the tags for each repo updated first
 - Need to implement shortlog command to create changelog. Will have to take version number and do some string manipulation to get previous version (1.3.0 to 1.2.0) or add it as a parameter of the script