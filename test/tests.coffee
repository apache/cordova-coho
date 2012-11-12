VERSION = '2.2.0'
oldVersion = '2.1.0'

exports['sanity test'] = (test)-> 
    test.expect 1
    test.ok true, "this assertion should pass"
    test.done()

exports['test cli callable'] = (test)->
	util = require('util')
	exec = require('child_process').exec
	
	thetest = (error, stdout, stderr)->
		if error isnt null
			test.ok false, 'coho invocation returned an error'
			test.done()
		else
			test.ok true, 'successfully called coho'
			test.done()
			
	child = exec "./coho all #{VERSION} #{oldVersion}", thetest

exports['creating temp directory'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp")
	test.done()

exports['creating release directory']=(test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/release")
	test.done()

exports['confirm ios clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-ios/CordovaLib/VERSION")
	test.done()

exports['confirm android clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-android/VERSION")
	test.done()

exports['confirm blackberry clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-blackberry-webworks/VERSION")
	test.done()

exports['confirm windows 8 clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-windows/windows8/VERSION")
	test.done()

exports['confirm windows phone clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-wp7/VERSION")
	test.done()

exports['confirm webos clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-webos/VERSION")
	test.done()		

exports['confirm bada clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-bada/VERSION")
	test.done()

exports['confirm bada-wac clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-bada-wac/VERSION")
	test.done()

exports['confirm docs clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-docs/VERSION")
	test.done()

exports['confirm docs clone worked'] = (test)->
    test.expect 1
    fs = require('fs')
    test.ok fs.existsSync("./temp/repositories/incubator-cordova-docs/VERSION")
    test.done()

exports['confirm cordova-js clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-js/VERSION")
	test.done()
  	
exports['confirm hello world app clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-app-hello-world/VERSION")
	test.done()
        	
exports['confirm qt clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-qt/VERSION")
	test.done()
            	
exports['confirm tizen clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-tizen/VERSION")
	test.done()
                	
exports['confirm mac clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-mac/VERSION")
	test.done()
                    	
exports['confirm mobile-spec clone worked'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/repositories/incubator-cordova-mobile-spec/VERSION")
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

exports['check windows 8 version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-windows/windows8/VERSION', 'ascii') != VERSION
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check windows phone version number'] = (test)->
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

exports['check bada-wac version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-bada-wac/VERSION', 'ascii') != VERSION+"\n"
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check bada version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-bada/VERSION', 'ascii') != VERSION+"\n"
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check docs version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-docs/VERSION', 'ascii') != VERSION
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check cordova-js version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-js/VERSION', 'ascii') != VERSION+"\n"
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check hello world app version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-app-hello-world/VERSION', 'ascii') != VERSION+"\n"
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()
		
exports['check QT version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-qt/VERSION', 'ascii') != VERSION+"\n"
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check tizen version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-tizen/VERSION', 'ascii') != VERSION+"\n"
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()
		
exports['check mac version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-mac/VERSION', 'ascii') != VERSION+"\n"
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['check mobile spec version number'] = (test)->
	test.expect 1
	fs = require('fs')
	if fs.readFileSync('./temp/repositories/incubator-cordova-mobile-spec/VERSION', 'ascii') != VERSION+"\n"
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['license copied into release'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/release/src/cordova-"+VERSION+"/LICENSE")
	test.done()
	
exports['readme copied into release'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/release/src/cordova-"+VERSION+"/README.MD")
	test.done()

exports['test if changelog generated'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/release/src/cordova-"+VERSION+"/changelog")
	test.done()

exports['confirm src zip file']=(test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/release/src/cordova-"+VERSION+"-src.zip")
	test.done()

exports['confirm src asc file']=(test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/release/src/cordova-"+VERSION+"-src.zip.asc")
	test.done()

exports['confirm src md5 file']=(test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.existsSync("./temp/release/src/cordova-"+VERSION+"-src.zip.md5")
	test.done()	

exports['test if src zip is empty'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.statSync("./temp/release/src/cordova-"+VERSION+"-src.zip").size != 0, 'src zip created too soon'
	test.done()

exports['test if src asc is empty'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.statSync("./temp/release/src/cordova-"+VERSION+"-src.zip.asc").size != 0, 'src asc created too soon'
	test.done()

exports['test if src md5 is empty'] = (test)->
	test.expect 1
	fs = require('fs')
	test.ok fs.statSync("./temp/release/src/cordova-"+VERSION+"-src.zip.md5").size != 0, 'src md5 created too soon'
	test.done()	
		
