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

var optimist = require('optimist');
var shelljs = require('shelljs');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var apputil = require('./apputil');
var executil = require('./executil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');
var print = apputil.print;

exports.createCommand = function*(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    opt = opt
        .options('tag', {
            desc: 'The pre-existing tag or hash to archive (defaults to newest tag on branch)'
         })
        .options('sign', {
            desc: 'Whether to create .asc, .md5, .sha files (defaults to true)',
            type: 'boolean',
            default: true
         })
        .options('dest', {
            desc: 'The directory to hold the resulting files.',
            demand: true
         });
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Creates a .zip, .asc, .md5, .sha for a repo at a tag or hash.\n' +
               'Refer to https://wiki.apache.org/cordova/SetUpGpg for how to set up gpg\n' +
               '\n' +
               'Usage: $0 create-archive [--tag tagname] [--sign] --repo=name [-r repos] --dest cordova-dist-dev/CB-1111')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);

    if (argv.sign && !shelljs.which('gpg')) {
        apputil.fatal('gpg command not found on your PATH. Refer to https://wiki.apache.org/cordova/SetUpGpg');
    }

    var outDir = apputil.resolveUserSpecifiedPath(argv.dest);
    shelljs.mkdir('-p', outDir);
    var absOutDir = path.resolve(outDir);

    yield repoutil.forEachRepo(repos, function*(repo) {
        var tag = argv.tag || (yield gitutil.findMostRecentTag());
        yield gitutil.gitCheckout(tag);
        print('Creating archive of ' + repo.repoName + '@' + tag);

        if (!(repo.id==='mobile-spec' || repo.id==='app-hello-world' || repo.id.indexOf('plugin-')==0)) {
            if (yield gitutil.pendingChangesExist()) {
                apputil.fatal('Aborting because pending changes exist in ' + repo.repoName);
            }
            var cmd = 'npm pack';
            /* Not needed since for-each cds to cordova-lib/cordova-lib for lib
            if (repo.id==='lib') cmd = 'npm pack cordova-'+repo.id;
            */
            /* Not needed anymore due to package.json moving to root
            if (repo.id==='windows') cmd = 'npm pack '+repo.id;

            if (repo.id==='windowsphone') cmd = 'npm pack wp8';
            */

            var tgzname = yield executil.execHelper(executil.ARGS(cmd), true);
            var outPath = path.join(absOutDir, tgzname);
            console.log(outPath);
            if (fs.existsSync(outPath)) {
                // remove what is already there, or else "npm pack" will fail
                fs.unlinkSync(outPath);
            }
            shelljs.mv(tgzname, outPath);
        } else {
            var outPath = path.join(absOutDir, repo.repoName + '-' + tag + '.zip');
            console.log(outPath);
            yield executil.execHelper(executil.ARGS('git archive --format zip --prefix ' + repo.repoName + '/ -o ', outPath, tag));
        }
        if (argv.sign) {
            yield executil.execHelper(executil.ARGS('gpg --armor --detach-sig --output', outPath + '.asc', outPath));
            fs.writeFileSync(outPath + '.md5', (yield computeHash(outPath, 'MD5')) + '\n');
            fs.writeFileSync(outPath + '.sha', (yield computeHash(outPath, 'SHA512')) + '\n');
        }
    });
    print();
    print('Archives created.');
    print('Verify them using: coho verify-archive ' + path.join(outDir, '*.zip') + ' ' + path.join(outDir, '*.tgz'));
}

exports.verifyCommand = function*(argv) {
    var opt = flagutil.registerHelpFlag(optimist);
    var argv = opt
        .usage('Ensures the given .zip files match their neighbouring .asc, .md5, .sha files.\n' +
               'Refer to https://wiki.apache.org/cordova/SetUpGpg for how to set up gpg\n' +
               '\n' +
               'Usage: $0 verify-archive a.zip b.zip c.zip')
        .argv;

    var zipPaths = argv._.slice(1);
    if (argv.h || !zipPaths.length) {
        optimist.showHelp();
        process.exit(1);
    }
    if (!shelljs.which('gpg')) {
        apputil.fatal('gpg command not found on your PATH. Refer to https://wiki.apache.org/cordova/SetUpGpg');
    }

    for (var i = 0; i < zipPaths.length; ++i) {
        var zipPath = apputil.resolveUserSpecifiedPath(zipPaths[i]);
        var result = yield executil.execHelper(executil.ARGS('gpg --verify', zipPath + '.asc', zipPath), false, true);
        if (result === null) {
            apputil.fatal('Verification failed. You may need to update your keys. Run: curl "https://dist.apache.org/repos/dist/release/cordova/KEYS" | gpg --import');
        }
        var md5 = yield computeHash(zipPath, 'MD5');
        if (extractHashFromOutput(fs.readFileSync(zipPath + '.md5', 'utf8')) !== md5) {
            apputil.fatal('MD5 does not match.');
        }
        var sha = yield computeHash(zipPath, 'SHA512');
        if (extractHashFromOutput(fs.readFileSync(zipPath + '.sha', 'utf8')) !== sha) {
            apputil.fatal('SHA512 does not match.');
        }
        print(zipPath + chalk.green(' signature and hashes verified.'));
    }
    print(chalk.green('Verified ' + zipPaths.length + ' signatures and hashes.'));
}

function *computeHash(path, algo) {
    print('Computing ' + algo + ' for: ' + path);
    var result = yield executil.execHelper(executil.ARGS('gpg --print-md', algo, path), true);
    return extractHashFromOutput(result);
}

function extractHashFromOutput(output) {
    return output.slice(output.lastIndexOf(':') + 1).replace(/\s*/g, '').toLowerCase();
}
