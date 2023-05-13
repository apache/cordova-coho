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

const glob = require('glob');
const optimist = require('optimist');
const shelljs = require('shelljs');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const apputil = require('./apputil');
const executil = require('./executil');
const flagutil = require('./flagutil');
const gitutil = require('./gitutil');
const repoutil = require('./repoutil');
const print = apputil.print;
const settingUpGpg = path.resolve(path.dirname(__dirname), 'docs', 'setting-up-gpg.md');
const isWin = process.platform === 'win32';

exports.GPG_DOCS = settingUpGpg;

exports.createCommand = function * (argv) {
    let opt = flagutil.registerRepoFlag(optimist);
    opt = opt
        .options('tag', {
            desc: 'The pre-existing tag or hash to archive (defaults to newest tag on branch)'
        })
        .options('allow-pending', {
            desc: 'Whether to allow uncommitted changes to exist when packing (use only for testing)',
            type: 'boolean'
        })
        .options('sign', {
            desc: 'Whether to create .asc, .sha512 files (defaults to true)',
            type: 'boolean',
            default: 'true'
        })
        .options('dest', {
            desc: 'The directory to hold the resulting files.',
            default: '.'
        });
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt // eslint-disable-line
        .usage('Creates a .zip, .asc, .sha for a repo at a tag or hash.\n' +
               'Refer to ' + settingUpGpg + ' for how to set up gpg\n' +
               '\n' +
               'Usage: $0 create-archive [--tag tagname] [--sign] --repo=name [-r repos] --dest cordova-dist-dev/CB-1111')
        .argv;
    // Optimist doesn't cast from string :(
    argv.sign = argv.sign === true || argv.sign === 'true';
    argv['allow-pending'] = argv['allow-pending'] === true || argv['allow-pending'] === 'true';

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    const repos = flagutil.computeReposFromFlag(argv.r, { includeModules: true });

    if (argv.sign && !shelljs.which('gpg')) {
        apputil.fatal('gpg command not found on your PATH. Refer to ' + settingUpGpg);
    }

    const outDir = apputil.resolveUserSpecifiedPath(argv.dest);
    shelljs.mkdir('-p', outDir);
    const absOutDir = path.resolve(outDir);

    yield repoutil.forEachRepo(repos, function * (repo) {
        if (isWin) {
            yield checkLineEndings(repo);
        }

        const tag = argv.tag || (yield gitutil.findMostRecentTag(repo.versionPrefix))[0];
        if (!tag) {
            apputil.fatal('Could not find most recent tag. Try running with --tag');
        }
        if (!argv['allow-pending'] && (yield gitutil.pendingChangesExist())) {
            apputil.fatal('Aborting because pending changes exist in ' + repo.repoName + ' (run "git status")');
        }
        const origBranch = yield gitutil.retrieveCurrentBranchName(true);

        yield gitutil.gitCheckout(tag);

        yield createArchive(repo, tag, absOutDir, argv.sign);

        if (origBranch) {
            yield gitutil.gitCheckout(origBranch);
        }
    });
    print();
    print('Archives created.');
    print('Verify them using: coho verify-archive ' + path.join(outDir, '*.tgz'));
};

// WARNING: NEEDS to be executed in the current working directory of a cordova repo!!!
function * createArchive (repo, tag, outDir, sign) {
    print('Creating archive of ' + repo.repoName + '@' + tag);
    let outPath;
    if (repo.id !== 'mobile-spec') {
        const pkgInfo = require(path.resolve('package'));
        const tgzname = pkgInfo.name + '-' + tag + '.tgz';
        yield executil.execHelper(executil.ARGS('npm pack'), 1, false);
        outPath = path.join(outDir, tgzname);
        if (path.resolve(tgzname) !== outPath) {
            shelljs.rm('-f', outPath + '*');
            shelljs.mv(tgzname, outPath);
        }
    } else {
        outPath = path.join(outDir, repo.repoName + '-' + tag + '.zip');
        yield executil.execHelper(executil.ARGS('git archive --format zip --prefix ' + repo.repoName + '/ -o ', outPath, tag));
    }
    print('Created archive: ' + outPath);
    if (sign) {
        yield executil.execHelper(executil.ARGS('gpg --armor --detach-sig --output', outPath + '.asc', outPath), false, false);
        fs.writeFileSync(outPath + '.sha512', (yield computeHash(outPath, 'SHA512')) + '\n');
    }
    return outPath;
}

exports.createArchive = createArchive;

exports.verifyCommand = function * () {
    const opt = flagutil.registerHelpFlag(optimist);
    const argv = opt
        .usage('Ensures the given .zip files match their neighbouring .asc, .sha512 files.\n' +
               'Refer to ' + settingUpGpg + ' for how to set up gpg\n' +
               '\n' +
               'Usage: $0 verify-archive a.zip b.zip c.zip')
        .argv;

    const zipPaths = argv._.slice(1);
    if (argv.h || !zipPaths.length) {
        optimist.showHelp();
        process.exit(1);
    }
    if (!shelljs.which('gpg')) {
        apputil.fatal('gpg command not found on your PATH. Refer to ' + settingUpGpg);
    }

    const resolvedZipPaths = zipPaths.reduce(function (current, zipPath) {
        const matchingPaths = glob.sync(apputil.resolveUserSpecifiedPath(zipPath));
        if (!matchingPaths || !matchingPaths.length) {
            apputil.fatal(chalk.red('No files found that match \'' + zipPath + '\''));
        }
        return current.concat(matchingPaths);
    }, []);

    for (let i = 0; i < resolvedZipPaths.length; ++i) {
        const zipPath = resolvedZipPaths[i];
        yield verifyArchive(zipPath);
    }
    print(chalk.green('Verified ' + resolvedZipPaths.length + ' signatures and hashes.'));
};

function * verifyArchive (archive) {
    const result = yield executil.execHelper(executil.ARGS('gpg --verify', archive + '.asc', archive), false, true);
    if (result === null) {
        apputil.fatal('Verification failed. You may need to update your keys. Run: curl "https://dist.apache.org/repos/dist/release/cordova/KEYS" | gpg --import');
    }

    const sha = yield computeHash(archive, 'SHA512');
    let archiveFileName = archive + '.sha512';
    const oldArchiveFileName = archive + '.sha';

    if (fs.existsSync(oldArchiveFileName) && !fs.existsSync(archiveFileName)) {
        print('Old .sha extension found, this might have been generated by an old cordova-coho version. Using .sha extension for the check.');
        archiveFileName = oldArchiveFileName;
    }

    if (extractHashFromOutput(fs.readFileSync(archiveFileName, 'utf8')) !== sha) {
        apputil.fatal('SHA512 does not match.');
    }
    print(archive + chalk.green(' signature and hashes verified.'));
}

exports.verifyArchive = verifyArchive;

function * computeHash (path, algo) {
    print('Computing ' + algo + ' for: ' + path);
    const result = yield executil.execHelper(executil.ARGS('gpg --print-md', algo, path), true);
    return extractHashFromOutput(result);
}

function extractHashFromOutput (output) {
    return output.slice(output.lastIndexOf(':') + 1).replace(/\s*/g, '').toLowerCase();
}

function * checkLineEndings (repo) {
    let autoCRLF;
    let eol;
    let msg = '';

    try {
        autoCRLF = yield executil.execHelper(executil.ARGS('git config --get core.autocrlf'), true);
    } catch (e) {
        autoCRLF = '';
    }

    try {
        eol = yield executil.execHelper(executil.ARGS('git config --get core.eol'), true);
    } catch (e) {
        eol = '';
    }

    if (autoCRLF !== 'false') {
        msg = 'Warning: core.autocrlf is set to "' + autoCRLF + '".\n' +
            'Set either "' + repo.repoName + '" or global core.autocrlf setting to "false" to avoid issues with executables on non-Windows OS.\n';
    }

    if (eol !== 'lf') {
        msg += 'Warning: core.eol is set to "' + eol + '". Set it to "lf" to normalize line endings.\n';
    }

    if (msg) {
        console.error(msg +
            'Run these commands in the repos:\n' +
            '    git config core.eol lf\n' +
            '    git config core.autocrlf false\n' +
            '    git rm --cached -r .\n' +
            '    git reset --hard\n' +
            'Alternatively you can setup it globally for your user:\n' +
            '    git config --global core.eol lf\n' +
            '    git config --global core.autocrlf false\n' +
            'Or update the repos automatically using coho (change the repo groups to your ones):\n' +
            '   coho for-each -r tools -r android -r ios "git config core.eol lf && git config core.autocrlf false && git rm --cached -r . && git reset --hard"');

        process.exit(1);
    }
}
