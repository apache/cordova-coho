var test = require('tape');
var flagutil = require('../src/flagutil');

test('test computeReposFromFlagAndroid', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('android');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'android');
    t.equal(repo[0].repoName, 'cordova-android');
});
test('test computeReposFromFlagiOS', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('ios');

    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'ios');
    t.equal(repo[0].repoName, 'cordova-ios');
});

test('test computeReposFromFlagWindows', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('windows');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
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
test('test computeReposFromFlagWindowsPhone8', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('wp8');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'wp8');
    t.equal(repo[0].repoName, 'cordova-wp8');
});

test('test computeReposFromFlagBlackberry', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('blackberry');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'blackberry');
    t.equal(repo[0].repoName, 'cordova-blackberry');
});
test('test computeReposFromFlagFirefoxos', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('firefoxos');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'firefoxos');
    t.equal(repo[0].repoName, 'cordova-firefoxos');
});
test('test computeReposFromFlagOsx', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('osx');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'osx');
    t.equal(repo[0].repoName, 'cordova-osx');
});
test('test computeReposFromFlagUbuntu', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('ubuntu');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'ubuntu');
    t.equal(repo[0].repoName, 'cordova-ubuntu');
});
test('test computeReposFromFlagAmazon-fireos', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('amazon-fireos');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'amazon-fireos');
    t.equal(repo[0].repoName, 'cordova-amazon-fireos');
});
test('test computeReposFromFlagBrowser', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('browser');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'browser');
    t.equal(repo[0].repoName, 'cordova-browser');
});
test('test computeReposFromFlagBada', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('bada');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'bada');
    t.equal(repo[0].repoName, 'cordova-bada');
});
test('test computeReposFromFlagBada-wac', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('bada-wac');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'bada-wac');
    t.equal(repo[0].repoName, 'cordova-bada-wac');
});
test('test computeReposFromFlagWebOS', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('webos');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'webos');
    t.equal(repo[0].repoName, 'cordova-webos');
});
test('test computeReposFromFlagQt', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('qt');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'qt');
    t.equal(repo[0].repoName, 'cordova-qt');
});
test('test computeReposFromFlagTizen', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('tizen');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'tizen');
    t.equal(repo[0].repoName, 'cordova-tizen');
});
test('test computeReposFromFlagDocs', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('docs');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'docs');
    t.equal(repo[0].repoName, 'cordova-docs');
});
test('test computeReposFromFlagMobilespec', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('mobile-spec');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'mobile-spec');
    t.equal(repo[0].repoName, 'cordova-mobile-spec');
});
test('test computeReposFromFlagAppHelloWorld', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('app-hello-world');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'app-hello-world');
    t.equal(repo[0].repoName, 'cordova-app-hello-world');
});
test('test computeReposFromFlagPluginBatteryStatus', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-battery-status');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-battery-status');
    t.equal(repo[0].repoName, 'cordova-plugin-battery-status');
});
test('test computeReposFromFlagPluginCamera', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-camera');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-camera');
    t.equal(repo[0].repoName, 'cordova-plugin-camera');
});
test('test computeReposFromFlagPluginConsole', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-console');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-console');
    t.equal(repo[0].repoName, 'cordova-plugin-console');
});
test('test computeReposFromFlagPluginContacts', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-contacts');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-contacts');
    t.equal(repo[0].repoName, 'cordova-plugin-contacts');
});
test('test computeReposFromFlagDocs', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('docs');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'docs');
    t.equal(repo[0].repoName, 'cordova-docs');
});
test('test computeReposFromFlagPluginDeviceMotion', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-device-motion');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-device-motion');
    t.equal(repo[0].repoName, 'cordova-plugin-device-motion');
});
test('test computeReposFromFlagPluginDeviceOrientation', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-device-orientation');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-device-orientation');
    t.equal(repo[0].repoName, 'cordova-plugin-device-orientation');
});

test('test computeReposFromFlagPlugin-device', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-device');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-device');
    t.equal(repo[0].repoName, 'cordova-plugin-device');
});

test('test computeReposFromFlagPluginDialogs', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-dialogs');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-dialogs');
    t.equal(repo[0].repoName, 'cordova-plugin-dialogs');
});

test('test computeReposFromFlagPluginFileTransfer', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-file-transfer');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-file-transfer');
    t.equal(repo[0].repoName, 'cordova-plugin-file-transfer');
});

test('test computeReposFromFlagPluginGeolocation', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-geolocation');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-geolocation');
    t.equal(repo[0].repoName, 'cordova-plugin-geolocation');
});

test('test computeReposFromFlagPluginGlobalization', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-globalization');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-globalization');
    t.equal(repo[0].repoName, 'cordova-plugin-globalization');
});
test('test computeReposFromFlagInappbrowser', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-inappbrowser');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-inappbrowser');
    t.equal(repo[0].repoName, 'cordova-plugin-inappbrowser');
});
test('test computeReposFromFlagMedia', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-media');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-media');
    t.equal(repo[0].repoName, 'cordova-plugin-media');
});
test('test computeReposFromFlagMediaCapture', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-media-capture');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-media-capture');
    t.equal(repo[0].repoName, 'cordova-plugin-media-capture');
});
test('test computeReposFromFlagNetworkInformation', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-network-information');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-network-information');
    t.equal(repo[0].repoName, 'cordova-plugin-network-information');
});
test('test computeReposFromFlagSplashscreen', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-splashscreen');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-splashscreen');
    t.equal(repo[0].repoName, 'cordova-plugin-splashscreen');
});
test('test computeReposFromFlagVibration', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-vibration');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-vibration');
    t.equal(repo[0].repoName, 'cordova-plugin-vibration');
});
test('test computeReposFromFlagStatusbar', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-statusbar');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-statusbar');
    t.equal(repo[0].repoName, 'cordova-plugin-statusbar');
});
test('test computeReposFromFlagWhitelist', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-whitelist');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-whitelist');
    t.equal(repo[0].repoName, 'cordova-plugin-whitelist');
});
test('test computeReposFromFlagLegacyWhitelist', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-legacy-whitelist');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-legacy-whitelist');
    t.equal(repo[0].repoName, 'cordova-plugin-legacy-whitelist');
});
test('test computeReposFromFlagPlugins', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('cordova-plugins');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'cordova-plugins');
    t.equal(repo[0].repoName, 'cordova-plugins');
});
test('test computeReposFromFlagTestFramework', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugin-test-framework');
  //  console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugin-test-framework');
    t.equal(repo[0].repoName, 'cordova-plugin-test-framework');
});
test('test computeReposFromFlagCli', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('cli');
    //console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'cli');
    t.equal(repo[0].repoName, 'cordova-cli');
});
test('test computeReposFromFlagPlugman', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('plugman');
    //console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'plugman');
    t.equal(repo[0].repoName, 'cordova-plugman');
});
test('test computeReposFromFlagLib', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('lib');
    //console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'lib');
    t.equal(repo[0].repoName, 'cordova-lib');
});
test('test computeReposFromFlagServe', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('serve');
    //console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'serve');
    t.equal(repo[0].repoName, 'cordova-lib');
});
test('test computeReposFromFlagJs', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('js');
    //console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'js');
    t.equal(repo[0].repoName, 'cordova-js');
});
test('test computeReposFromFlagCoho', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('coho');
    //console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'coho');
    t.equal(repo[0].repoName, 'cordova-coho');
});
test('test computeReposFromFlagMedic', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('medic');
    //console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'medic');
    t.equal(repo[0].repoName, 'cordova-medic');
});
test('test computeReposFromFlagAppharness', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('app-harness');
    //console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'app-harness');
    t.equal(repo[0].repoName, 'cordova-app-harness');
});
test('test computeReposFromFlagLabs', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('labs');
    //console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'labs');
    t.equal(repo[0].repoName, 'cordova-labs');
});
test('test computeReposFromFlagRegistryWeb', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('registry-web');
    //console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'registry-web');
    t.equal(repo[0].repoName, 'cordova-registry-web');
});
test('test computeReposFromFlagRegistry', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('registry');
    //console.log(Object.getOwnPropertyNames(repo[0]));
    console.log(repo);
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'registry');
    t.equal(repo[0].repoName, 'cordova-registry');
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
//     //console.log(flagutil.computeReposFromFlag('android'))
//     var repo = flagutil.computeReposFromFlag('private-pmc');
//     //console.log(Object.getOwnPropertyNames(repo[0]));
//     console.log(repo);
//     t.equal(repo.length, 1);
//     t.equal(typeof repo[0], 'object');
//     t.equal(repo[0].id, 'private-pmc');
//     t.equal(repo[0].repoName, 'cordova-private-pmc');
// });
// test('test computeReposFromFlagWebsite', function(t) {
//     t.plan(4);
// 
//     //console.log(flagutil.computeReposFromFlag('android'))
//     var repo = flagutil.computeReposFromFlag('website');
//     //console.log(Object.getOwnPropertyNames(repo[0]));
//     console.log(repo);
//     t.equal(repo.length, 1);
//     t.equal(typeof repo[0], 'object');
//     t.equal(repo[0].id, 'website');
//     t.equal(repo[0].repoName, 'cordova-website');
// });
