VERSION = '1.5.0'
oldVersion = '1.4.1'

exports['sanity test'] = (test)-> 
    test.expect 1
    test.ok true, "this assertion should pass"
    test.done()

exports['test cli callable'] = (test)->
	util = require('util')
	exec = require('child_process').exec
	
	thetest = (error, stdout, stderr)->
		if error isnt null
			test.ok false, 'coho fucked up'
			test.done()
		else
			test.ok true, 'successfully called coho'
			test.done()
			
	child = exec "./coho #{VERSION} #{oldVersion}", thetest

exports['creating temp directory'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp")
	test.done()

exports['creating release directory']=(test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release")
	test.done()

exports['creating lib directory']=(test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib")
	test.done()

exports['creating ios directory']=(test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/ios")
	test.done()

exports['creating android directory']=(test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/android")
	test.done()

exports['creating blackberry directory']=(test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/blackberry")
	test.done()

exports['creating windows directory']=(test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/windows")
	test.done()

exports['creating webos directory']=(test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/webos")
	test.done()

exports['creating bada directory']=(test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/bada")
	test.done()

exports['confirm ios clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/incubator-cordova-ios/CordovaLib/VERSION")
	test.done()

exports['confirm android clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/incubator-cordova-android/VERSION")
	test.done()

exports['confirm blackberry clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/incubator-cordova-blackberry-webworks/VERSION")
	test.done()

exports['confirm windows clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/incubator-cordova-wp7/VERSION")
	test.done()

exports['confirm webos clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/incubator-cordova-webos/VERSION")
	test.done()		

exports['confirm bada clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/incubator-cordova-bada/VERSION")
	test.done()

exports['confirm docs clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/incubator-cordova-docs/VERSION")
	test.done()

exports['check ios version number'] = (test)->
	test.expect 1
	fs = require('fs')	
	if fs.readFileSync('./temp/repositories/incubator-cordova-ios/CordovaLib/VERSION', 'ascii') != VERSION
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check android version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-android/VERSION', 'utf8') != VERSION+"\n"
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check blackberry version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-blackberry-webworks/VERSION', 'ascii') != VERSION+"\n"
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check windows version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-wp7/VERSION', 'ascii') != VERSION
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check webos version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-webos/VERSION', 'ascii') != VERSION
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check bada version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-bada/VERSION', 'ascii') != VERSION+"\n\n"
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check docs version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-docs/VERSION', 'ascii') != VERSION+"\n"
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['docs script successfull'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/incubator-cordova-docs/public")
	test.done()

exports['docs copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/doc")
	test.done()
	
exports['ios script successfull'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/incubator-cordova-ios/dist/Cordova-"+VERSION+".dmg")
	test.done()

exports['ios dmg copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/ios/Cordova-"+VERSION+".dmg")
	test.done()

exports['ios notice file copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/ios/NOTICE")
	test.done()

exports['ios dmg sha1 copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/ios/Cordova-"+VERSION+".dmg.SHA1")
	test.done()

exports['android script successfull'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/incubator-cordova-android/example/libs/cordova-"+VERSION+".jar")
	test.done()

exports['android cordova js copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/android/cordova-"+VERSION+".js")
	test.done()

exports['android cordova jar copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/android/cordova-"+VERSION+".jar")
	test.done()

exports['android notice file copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/android/NOTICE")
	test.done()

exports['android xml folder copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/android/xml")
	test.done()

exports['android example copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/android/example")
	test.done()

exports['blackberry script successfull'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/incubator-cordova-blackberry-webworks/dist/www/cordova-"+VERSION+".js")
	test.done()

exports['blackberry copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/blackberry/README.md")
	test.done()
	
exports['blackberry notice file copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/blackberry/README.md")
	test.done()
	
exports['windows copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/windows/Cordova-"+VERSION+"-Starter.zip")
	test.done()

exports['webos copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/webos/VERSION")
	test.done()

exports['bada copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/bada/VERSION")
	test.done()
		
exports['license copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/license")
	test.done()
	
exports['version file copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/version")
	test.done()
	
exports['readme copied into release'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/readme.md")
	test.done()
	
exports['test if symbian depreciation file copied'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/symbian/depreciate.txt")
	test.done()

exports['test if changelog generated'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/changelog")
	test.done()

exports['zip exists'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/cordova-#{ VERSION }.zip")
	test.done()
	
exports['test if zip is empty'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.statSync("./temp/cordova-#{ VERSION }.zip").size != 0, 'zip created too soon'
	test.done()
