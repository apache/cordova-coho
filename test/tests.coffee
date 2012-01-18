VERSION = '1.3.0'

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
			
	child = exec "./coho #{ VERSION }", thetest

exports['creating temp directory'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp")
	test.done()

exports['creating ios subdirectory'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/ios")
	test.done()
	
exports['confirm ios pull worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/ios/cordova-ios/PhoneGapLib/VERSION")
	test.done()

exports['check version number'] = (test)->
	test.expect 1
	fs = require('fs')
	
	vFile = fs.readFileSync('./temp/ios/cordova-ios/PhoneGapLib/VERSION', 'ascii')
	if vFile != VERSION
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['zip exists'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/ios/cordova-ios/phonegap-#{ VERSION }.zip")
	test.done()
