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

var fs = require('fs');
var path = require('path');
var optimist = require('optimist');
var shelljs = require('shelljs');
var flagutil = require('./flagutil');

var packman = 'npm';

function * createLink (argv) {
    var opt = flagutil.registerHelpFlag(optimist);
    argv = opt
        .usage('Does an npm-link of the modules that we publish. Ensures we are testing live versions of our own dependencies instead of the last published version.\n' +
               '\n' +
               'Usage: $0 npm-link' +
               'Example usage: $0 npm-link --use-yarn\n'
               )
        .options('use-yarn', {
            desc: 'Use the yarn package manager instead of npm',
            type: 'bool',
            default: false
        })
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    if (argv['use-yarn']) {
        packman = 'yarn';
        console.log('Using the yarn package manager.');
    } else {
        console.log('Using npm');
    }

    function npmLinkIn (linkedModule, installingModule) {
        cdInto(installingModule);
       // 'npm link' will automatically unbuild a non-linked module if it is present,
       // so don't need to explicitly 'rm -r' it first.
        shelljs.exec(packman + ' link ' + linkedModule);
        cdOutOf();
    }

    function npmLinkOut (moduleName) {
        cdInto(moduleName);
        shelljs.exec(packman + ' link');
        cdOutOf();
    }

    console.log('npm-linking dependent modules');

    // Do npm-link
    npmLinkOut('cordova-cli');
    npmLinkOut('cordova-common');
    npmLinkOut('cordova-create');
    npmLinkOut('cordova-fetch');
    npmLinkOut('cordova-js');
    npmLinkOut('cordova-lib');
    npmLinkOut('cordova-plugman');
    npmLinkOut('cordova-serve');

    // Do npm-link <module> in cordova-fetch
    npmLinkIn('cordova-common', 'cordova-fetch');

    // Do npm-link <module> in cordova-create
    npmLinkIn('cordova-common', 'cordova-create');
    npmLinkIn('cordova-fetch', 'cordova-create');

    // Do npm-link <module> in cordova-lib
    npmLinkIn('cordova-common', 'cordova-lib');
    npmLinkIn('cordova-create', 'cordova-lib');
    npmLinkIn('cordova-fetch', 'cordova-lib');
    npmLinkIn('cordova-js', 'cordova-lib');
    npmLinkIn('cordova-serve', 'cordova-lib');

    // Do npm-link <module> in cordova-cli
    npmLinkIn('cordova-common', 'cordova-cli');
    npmLinkIn('cordova-create', 'cordova-cli');
    npmLinkIn('cordova-fetch', 'cordova-cli');
    npmLinkIn('cordova-js', 'cordova-cli');
    npmLinkIn('cordova-lib', 'cordova-cli');
    npmLinkIn('cordova-serve', 'cordova-cli');

    // Do npm-link <module> in cordova-plugman
    npmLinkIn('cordova-common', 'cordova-plugman');
    npmLinkIn('cordova-create', 'cordova-plugman');
    npmLinkIn('cordova-fetch', 'cordova-plugman');
    npmLinkIn('cordova-js', 'cordova-plugman');
    npmLinkIn('cordova-lib', 'cordova-plugman');
    npmLinkIn('cordova-serve', 'cordova-plugman');
}

module.exports = createLink;

function cdInto (moduleName) {
    shelljs.pushd(moduleName);
}

function cdOutOf () {
    shelljs.popd();
}

function verifyLink (linkedModule, installedModule) {
    cdInto(installedModule);
    var linkedPath = path.join(shelljs.pwd(), 'node_modules', linkedModule);
    if (!fs.existsSync(linkedPath)) {
        return false;
    }

    var myStat = fs.lstatSync(linkedPath);
    if (!myStat.isSymbolicLink()) {
        return false;
    }

    cdOutOf();
    return true;
}

module.exports.verifyLink = verifyLink;
