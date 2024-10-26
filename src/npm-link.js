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

const fs = require('fs');
const path = require('path');
const optimist = require('optimist');
const shelljs = require('shelljs');
const flagutil = require('./flagutil');
const executil = require('./executil');

let packman = 'npm';

function * createLink (argv) {
    const opt = flagutil.registerHelpFlag(optimist);
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

    function * npmLinkIn (linkedModule, installingModule) {
        cdInto(installingModule);
        // 'npm link' will automatically unbuild a non-linked module if it is present,
        // so don't need to explicitly 'rm -r' it first.
        yield executil.execHelper(executil.ARGS(packman + ' link ' + linkedModule));
        cdOutOf();
    }

    function * npmLinkOut (moduleName) {
        cdInto(moduleName);
        yield executil.execHelper(executil.ARGS(packman + ' link'));
        cdOutOf();
    }

    console.log('npm-linking dependent modules');

    // Do npm-link
    yield npmLinkOut('cordova-cli');
    yield npmLinkOut('cordova-common');
    yield npmLinkOut('cordova-create');
    yield npmLinkOut('cordova-fetch');
    yield npmLinkOut('cordova-js');
    yield npmLinkOut('cordova-lib');
    yield npmLinkOut('cordova-plugman');
    yield npmLinkOut('cordova-serve');

    // Do npm-link <module> in cordova-fetch
    yield npmLinkIn('cordova-common', 'cordova-fetch');

    // Do npm-link <module> in cordova-create
    yield npmLinkIn('cordova-common', 'cordova-create');
    yield npmLinkIn('cordova-fetch', 'cordova-create');

    // Do npm-link <module> in cordova-lib
    yield npmLinkIn('cordova-common', 'cordova-lib');
    yield npmLinkIn('cordova-create', 'cordova-lib');
    yield npmLinkIn('cordova-fetch', 'cordova-lib');
    yield npmLinkIn('cordova-js', 'cordova-lib');
    yield npmLinkIn('cordova-serve', 'cordova-lib');

    // Do npm-link <module> in cordova-cli
    yield npmLinkIn('cordova-common', 'cordova-cli');
    yield npmLinkIn('cordova-create', 'cordova-cli');
    yield npmLinkIn('cordova-fetch', 'cordova-cli');
    yield npmLinkIn('cordova-js', 'cordova-cli');
    yield npmLinkIn('cordova-lib', 'cordova-cli');
    yield npmLinkIn('cordova-serve', 'cordova-cli');

    // Do npm-link <module> in cordova-plugman
    yield npmLinkIn('cordova-common', 'cordova-plugman');
    yield npmLinkIn('cordova-create', 'cordova-plugman');
    yield npmLinkIn('cordova-fetch', 'cordova-plugman');
    yield npmLinkIn('cordova-js', 'cordova-plugman');
    yield npmLinkIn('cordova-lib', 'cordova-plugman');
    yield npmLinkIn('cordova-serve', 'cordova-plugman');
}

module.exports = createLink;

function cdInto (moduleName) {
    shelljs.pushd(moduleName);
}

function cdOutOf () {
    shelljs.popd();
}

function verifyLink (linkedModule, installedModule) {
    const linkedPath = path.join(path.resolve(installedModule), 'node_modules', linkedModule);
    if (!fs.existsSync(linkedPath)) {
        return false;
    }

    const myStat = fs.lstatSync(linkedPath);
    if (!myStat.isSymbolicLink()) {
        return false;
    }

    return true;
}

module.exports.verifyLink = verifyLink;
