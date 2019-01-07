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

var test = require('tape');
var flagutil = require('../src/flagutil');

test('test computeReposFromFlagAndroid', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('android');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'android');
    t.equal(repo[0].repoName, 'cordova-android');
});

test('test computeReposFromFlagiOS', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('ios');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'ios');
    t.equal(repo[0].repoName, 'cordova-ios');
});

test('test computeReposFromFlagWindows', function (t) {
    t.plan(5);
    var repo = flagutil.computeReposFromFlag('windows');
    t.equal(repo.length, 1);
    t.equal(repo[0].cordovaJsSrcName, 'cordova.windows.js');
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'windows');
    t.equal(repo[0].repoName, 'cordova-windows');
});

// test('test validateVersionString', function(t) {
//     t.plan(1);
//
//     //console.log(flagutil.computeReposFromFlag('android'))
//     var repo = flagutil.validateVersionString('2.0.0.0');
//   //  console.log(Object.getOwnPropertyNames(repo[0]));
//     console.log(repo);
//     t.equal(repo.length, 1);
//
// });

test('test computeReposFromFlagOsx', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('osx');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'osx');
    t.equal(repo[0].repoName, 'cordova-osx');
});

test('test computeReposFromFlagBrowser', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('browser');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'browser');
    t.equal(repo[0].repoName, 'cordova-browser');
});

test('test computeReposFromFlagDocs', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('docs');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'docs');
    t.equal(repo[0].repoName, 'cordova-docs');
});

test('test computeReposFromFlagMobilespec', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('mobile-spec');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'mobile-spec');
    t.equal(repo[0].repoName, 'cordova-mobile-spec');
});

test('test computeReposFromFlagAppHelloWorld', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('app-hello-world');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'app-hello-world');
    t.equal(repo[0].repoName, 'cordova-app-hello-world');
});

test('test computeReposFromFlagDocs', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('docs');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'docs');
    t.equal(repo[0].repoName, 'cordova-docs');
});

test('test computeReposFromFlagPluginBatteryStatus', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-battery-status');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-battery-status');
    t.equal(repo[0].repoName, 'cordova-plugin-battery-status');
});

test('test computeReposFromFlagPluginCamera', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-camera');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-camera');
    t.equal(repo[0].repoName, 'cordova-plugin-camera');
});

test('test computeReposFromFlagPlugin-device', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-device');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-device');
    t.equal(repo[0].repoName, 'cordova-plugin-device');
});

test('test computeReposFromFlagPluginDialogs', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-dialogs');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-dialogs');
    t.equal(repo[0].repoName, 'cordova-plugin-dialogs');
});

test('test computeReposFromFlagPluginFile', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-file');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-file');
    t.equal(repo[0].repoName, 'cordova-plugin-file');
});

test('test computeReposFromFlagPluginGeolocation', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-geolocation');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-geolocation');
    t.equal(repo[0].repoName, 'cordova-plugin-geolocation');
});

test('test computeReposFromFlagInappbrowser', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-inappbrowser');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-inappbrowser');
    t.equal(repo[0].repoName, 'cordova-plugin-inappbrowser');
});

test('test computeReposFromFlagMedia', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-media');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-media');
    t.equal(repo[0].repoName, 'cordova-plugin-media');
});

test('test computeReposFromFlagMediaCapture', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-media-capture');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-media-capture');
    t.equal(repo[0].repoName, 'cordova-plugin-media-capture');
});

test('test computeReposFromFlagNetworkInformation', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-network-information');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-network-information');
    t.equal(repo[0].repoName, 'cordova-plugin-network-information');
});

test('test computeReposFromFlagScreenOrientation', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-screen-orientation');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-screen-orientation');
    t.equal(repo[0].repoName, 'cordova-plugin-screen-orientation');
});

test('test computeReposFromFlagSplashscreen', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-splashscreen');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-splashscreen');
    t.equal(repo[0].repoName, 'cordova-plugin-splashscreen');
});

test('test computeReposFromFlagStatusbar', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-statusbar');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-statusbar');
    t.equal(repo[0].repoName, 'cordova-plugin-statusbar');
});

test('test computeReposFromFlagVibration', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-vibration');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-vibration');
    t.equal(repo[0].repoName, 'cordova-plugin-vibration');
});

test('test computeReposFromFlagWhitelist', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-whitelist');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-whitelist');
    t.equal(repo[0].repoName, 'cordova-plugin-whitelist');
});

test('test computeReposFromFlagWKWebViewEngine', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-wkwebview-engine');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-wkwebview-engine');
    t.equal(repo[0].repoName, 'cordova-plugin-wkwebview-engine');
});

test('test computeReposFromFlagPlugins', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('cordova-plugins');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'cordova-plugins');
    t.equal(repo[0].repoName, 'cordova-plugins');
});

test('test computeReposFromFlagTestFramework', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugin-test-framework');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-test-framework');
    t.equal(repo[0].repoName, 'cordova-plugin-test-framework');
});

test('test computeReposFromFlagCli', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('cli');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'cli');
    t.equal(repo[0].repoName, 'cordova-cli');
});

test('test computeReposFromFlagPlugman', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('plugman');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugman');
    t.equal(repo[0].repoName, 'cordova-plugman');
});

test('test computeReposFromFlagLib', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('lib');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'lib');
    t.equal(repo[0].repoName, 'cordova-lib');
});

test('test computeReposFromFlagServe', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('serve');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'serve');
    t.equal(repo[0].repoName, 'cordova-serve');
});

test('test computeReposFromFlagJs', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('js');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'js');
    t.equal(repo[0].repoName, 'cordova-js');
});

test('test computeReposFromFlagCoho', function (t) {
    t.plan(4);
    var repo = flagutil.computeReposFromFlag('coho');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'coho');
    t.equal(repo[0].repoName, 'cordova-coho');
});

// test('test computeReposFromFlagDist', function(t) {
//     t.plan(4);
//
//     //console.log(flagutil.computeReposFromFlag('android'))
//     var repo = flagutil.computeReposFromFlag('dist');
//     //console.log(Object.getOwnPropertyNames(repo[0]));
//     console.log(repo);
//     t.equal(repo.length, 1);
//     t.equal(typeof repo[0], 'object');
//     t.equal(repo[0].id, 'dist');
//     t.equal(repo[0].repoName, 'cordova-dist');
// });
// test('test computeReposFromFlagDistDev', function(t) {
//     t.plan(4);
//
//     //console.log(flagutil.computeReposFromFlag('android'))
//     var repo = flagutil.computeReposFromFlag('dist/dev');
//     //console.log(Object.getOwnPropertyNames(repo[0]));
//     console.log(repo);
//     t.equal(repo.length, 1);
//     t.equal(typeof repo[0], 'object');
//     t.equal(repo[0].id, 'dist/dev');
//     t.equal(repo[0].repoName, 'cordova-dist-dev');
// });
// test('test computeReposFromFlagPrivatepmc', function(t) {
//     t.plan(4);
//
//     var repo = flagutil.computeReposFromFlag('private-pmc');
//     t.equal(repo.length, 1);
//     t.equal(typeof repo[0], 'object');
//     t.equal(repo[0].id, 'private-pmc');
//     t.equal(repo[0].repoName, 'cordova-private-pmc');
// });
// test('test computeReposFromFlagWebsite', function(t) {
//     t.plan(4);
//     var repo = flagutil.computeReposFromFlag('website');
//     t.equal(repo.length, 1);
//     t.equal(typeof repo[0], 'object');
//     t.equal(repo[0].id, 'website');
//     t.equal(repo[0].repoName, 'cordova-website');
// });
