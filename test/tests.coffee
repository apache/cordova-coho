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

exports['creating release directory']=(test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release")
	test.done()

exports['creating doc directory']=(test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/doc")
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

exports['creating symbian directory']=(test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/lib/symbian")
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
	test.ok require('path').existsSync("./temp/repositories/callback-ios/PhoneGapLib/VERSION")
	test.done()

exports['confirm android clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/callback-android/VERSION")
	test.done()

exports['confirm blackberry clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/callback-blackberry/VERSION")
	test.done()

exports['confirm windows clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/callback-windows-phone/VERSION")
	test.done()

exports['confirm webos clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/callback-webos/VERSION")
	test.done()

exports['confirm symbian clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/callback-symbian/VERSION")
	test.done()			

exports['confirm bada clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/callback-bada/VERSION")
	test.done()

exports['confirm docs clone worked'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/repositories/callback-docs/VERSION")
	test.done()

exports['check ios version number'] = (test)->
	test.expect 1
	fs = require('fs')
	
	vFile = fs.readFileSync('./temp/repositories/callback-ios/PhoneGapLib/VERSION', 'ascii')
	if vFile != VERSION
		test.ok false, "VERSION file doesn't match release version"
		test.done()
	else
		test.ok true, "VERSION file matches release version"
		test.done()

exports['zip exists'] = (test)->
	test.expect 1
	test.ok require('path').existsSync("./temp/release/phonegap-#{ VERSION }.zip")
	test.done()
