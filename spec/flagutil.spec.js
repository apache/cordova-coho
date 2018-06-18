/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

var path = require('path');

var apputil = require('../src/apputil');
var repoutil = require('../src/repoutil');
var flagutil = require('../src/flagutil');

var TIMEOUT = 60000;

describe("flagutil unit tests", function () {

	it("Test#001 : validate the version that is passed in", function () {
		spyOn(console,"log").and.returnValue(false);
		spyOn(apputil, "fatal");
		flagutil.validateVersionString('6.3.0');
		expect(flagutil.validateVersionString('6.3.0')).toEqual('6.3.0');
		expect(apputil.fatal.calls.count()).toEqual(0);
	},TIMEOUT);

	it("Test#002 : computeReposFromFlag returns correct repo (platform) info", function () {
		var repo = flagutil.computeReposFromFlag('android');
		expect(repo).toEqual(
			[ Object({
			title: 'Android',
			versions: [ '4.4', '5.0', '5.1', '6.0', '7.0', '7.1' ],
			id: 'android',
			repoName: 'cordova-android',
			jiraComponentName: 'cordova-android',
			cordovaJsPaths: [ 'bin/templates/project/assets/www/cordova.js' ] }) ]
		);
	},TIMEOUT);

	it("Test#003 : computeReposFromFlag returns correct repo (plugin) info", function () {
		var repo = flagutil.computeReposFromFlag('plugin-camera');
		expect(repo).toEqual(
		[ { title: 'Plugin - Camera',
		    id: 'plugin-camera',
		    repoName: 'cordova-plugin-camera',
		    jiraComponentName: 'cordova-plugin-camera' } ]
		);
	},TIMEOUT);

	it("Test#004 : computeReposFromFlag returns correct repo (docs) info", function () {
		var repo = flagutil.computeReposFromFlag('docs');
		expect(repo).toEqual(
		[ { title: 'Docs',
		    id: 'docs',
		    repoName: 'cordova-docs',
		    jiraComponentName: 'cordova-docs' } ]
		);
	},TIMEOUT);

	it("Test#005 : passing in a non-repo is invalid", function () {
		spyOn(apputil, "fatal");
		var nonRepo = flagutil.computeReposFromFlag('nonRepo');
		expect(apputil.fatal.calls.count()).toEqual(1);
		expect(apputil.fatal.calls.argsFor(0)[0]).toMatch('Invalid repo value: nonRepo');
	},TIMEOUT);
});

