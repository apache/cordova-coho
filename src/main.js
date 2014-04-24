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

var co = require('co');
var fs = require('fs');
var path = require('path');
var superspawn = require('./superspawn');
var flagutil = require('./flagutil');
var apputil = require('./apputil');
var repoutil = require('./repoutil');
var print = apputil.print;
try {
    var optimist = require('optimist');
    var shjs = require('shelljs');
    var Q = require('q');
} catch (e) {
    console.log('Please run "npm install" from this directory:\n\t' + __dirname);
    process.exit(2);
}

var COMMON_RAT_EXCLUDES = [
    '*.wav',
    '*.webloc',
    '*jasmine-1.2.0*',
    '*.xcodeproj',
    '.*',
    '*-Info.plist',
    'VERSION',
    'node_modules',
    'thirdparty',
    'package.json',
    ];

var gitCommitCount = 0;

function reportGitPushResult(repos, branches) {
    print('');
    if (gitCommitCount) {
        var flagsStr = repos.map(function(r) { return '-r ' + r.id; }).join(' ') + ' ' + branches.map(function(b) { return '-b ' + b; }).join(' ');
        print('All work complete. ' + gitCommitCount + ' commits were made locally.');
        print('To review changes:');
        print('  ' + process.argv[1] + ' repo-status ' + flagsStr + ' | less');
        print('To push changes:');
        print('  ' + process.argv[1] + ' repo-push ' + flagsStr);
        print('To revert all local commits:');
        print('  ' + process.argv[1] + ' repo-reset ' + flagsStr);
    } else {
        print('All work complete. No commits were made.');
    }
}

function createPlatformDevVersion(version) {
    // e.g. "3.1.0" -> "3.2.0-dev".
    // e.g. "3.1.2-0.8.0-rc2" -> "3.2.0-0.8.0-dev".
    version = version.replace(/-rc.*$/, '');
    var parts = version.split('.');
    parts[1] = String(+parts[1] + 1);
    var cliSafeParts = parts[2].split('-');
    cliSafeParts[0] = '0';
    parts[2] = cliSafeParts.join('-');
    return parts.join('.') + '-dev';
}

function getVersionBranchName(version) {
    if (/-dev$/.test(version)) {
        return 'master';
    }
    return version.replace(/\d+(-?rc\d)?$/, 'x');
}

function ARGS(s, var_args) {
    var ret = s.trim().split(/\s+/);
    for (var i = 1; i < arguments.length; ++i) {
        ret.push(arguments[i]);
    }
    return ret;
}

function execHelper(cmdAndArgs, silent, allowError) {
    // there are times where we want silent but not allowError.
    if (null == allowError) {
        // default to allow failure if being silent.
        allowError = allowError || silent;
    }
    if (/^git commit/.exec(cmdAndArgs.join(' '))) {
        gitCommitCount++;
    }
    cmdAndArgs[0] = cmdAndArgs[0].replace(/^git /, 'git -c color.ui=always ');
    if (!silent) {
        print('Executing:', cmdAndArgs.join(' '));
    }
    // silent==2 is used only when modifying ulimit and re-exec'ing,
    // so don't be silent but allow whatever to happen.
    var result = superspawn.spawn(cmdAndArgs[0], cmdAndArgs.slice(1), {stdio: (silent && (silent !== 2)) ? 'default' : 'inherit'});
    return result.then(null, function(e) {
        if (allowError) {
            return null;
        } else if (!(silent === true)) {
            print(e.output);
        }
        process.exit(2);
    });
}

function cpAndLog(src, dest) {
    print('Coping File:', src, '->', dest);
    // Throws upon failure.
    shjs.cp('-f', src, dest);
    if (shjs.error()) {
        apputil.fatal('Copy failed.');
    }
}

function *gitCheckout(branchName) {
    var curBranch = yield retrieveCurrentBranchName(true);
    if (curBranch != branchName) {
        return yield execHelper(ARGS('git checkout -q ', branchName));
    }
}

var isInForEachRepoFunction = false;

function *forEachRepo(repos, func) {
    for (var i = 0; i < repos.length; ++i) {
        var repo = repos[i];
        var origPath = isInForEachRepoFunction ? process.cwd() : '..';
        var newPath = isInForEachRepoFunction ? path.join('..', repo.repoName) : repo.repoName;

        isInForEachRepoFunction = true;
        shjs.cd(newPath);
        if (shjs.error()) {
            apputil.fatal('Repo directory does not exist: ' + repo.repoName + '. First run coho repo-clone.');
        }
        yield func(repo);
        shjs.cd(origPath);

        isInForEachRepoFunction = origPath != '..';
    }
}

function createRepoUrl(repo) {
    return 'https://git-wip-us.apache.org/repos/asf/' + repo.repoName + '.git';
}

function *createArchiveCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    opt = opt
        .options('tag', {
            desc: 'The pre-existing tag to archive (defaults to newest tag on branch)'
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
        .usage('Creates a .zip, .asc, .md5, .sha for a repo at a tag.\n' +
               'Refer to https://wiki.apache.org/cordova/SetUpGpg for how to set up gpg\n' +
               '\n' +
               'Usage: $0 create-archive -r plugman -r cli --dest cordova-dist-dev/CB-1111')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);

    if (argv.sign && !shjs.which('gpg')) {
        apputil.fatal('gpg command not found on your PATH. Refer to https://wiki.apache.org/cordova/SetUpGpg');
    }

    var outDir = argv.dest;
    shjs.mkdir('-p', outDir);
    var absOutDir = path.resolve(outDir);

    yield forEachRepo(repos, function*(repo) {
        var tag = argv.tag || (yield findMostRecentTag());
        print('Creating archive of ' + repo.repoName + '@' + tag);

        if(repo.id==='plugman'|| repo.id==='cli'){
            var tgzname = yield execHelper(ARGS('npm pack'), true);
            var outPath = path.join(absOutDir, 'cordova-' + tgzname);
            shjs.mv(tgzname, outPath);
        }else{
            var outPath = path.join(absOutDir, repo.repoName + '-' + tag + '.zip');
            yield execHelper(ARGS('git archive --format zip --prefix ' + repo.repoName + '/ -o ', outPath, tag));
        }
        if (argv.sign) {
            yield execHelper(ARGS('gpg --armor --detach-sig --output', outPath + '.asc', outPath));
            fs.writeFileSync(outPath + '.md5', (yield computeHash(outPath, 'MD5')) + '\n');
            fs.writeFileSync(outPath + '.sha', (yield computeHash(outPath, 'SHA512')) + '\n');
        }
    });
    print();
    print('Archives created.');
    print('Verify them using: coho verify-archive ' + path.join(outDir, '*.zip') + ' ' + path.join(outDir, '*.tgz'));
}

function *computeHash(path, algo) {
    print('Computing ' + algo + ' for: ' + path);
    var result = yield execHelper(ARGS('gpg --print-md', algo, path), true);
    return extractHashFromOutput(result);
}

function extractHashFromOutput(output) {
    return output.replace(/.*?:/, '').replace(/\s*/g, '').toLowerCase();
}

function *verifyArchiveCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    opt = flagutil.registerHelpFlag(opt);
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
    if (!shjs.which('gpg')) {
        apputil.fatal('gpg command not found on your PATH. Refer to https://wiki.apache.org/cordova/SetUpGpg');
    }

    for (var i = 0; i < zipPaths.length; ++i) {
        var zipPath = zipPaths[i];
        yield execHelper(ARGS('gpg --verify', zipPath + '.asc', zipPath));
        var md5 = yield computeHash(zipPath, 'MD5');
        if (extractHashFromOutput(fs.readFileSync(zipPath + '.md5', 'utf8')) !== md5) {
            apputil.fatal('MD5 does not match.');
        }
        var sha = yield computeHash(zipPath, 'SHA512');
        if (extractHashFromOutput(fs.readFileSync(zipPath + '.sha', 'utf8')) !== sha) {
            apputil.fatal('SHA512 does not match.');
        }
        print(zipPath + ' signature and hashes verified.');
    }
}

function *printTagsCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Prints out tags & hashes for the given repos. Used in VOTE emails.\n' +
               '\n' +
               'Usage: $0 print-tags -r plugman -r cli')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);

    yield forEachRepo(repos, function*(repo) {
        var tag = yield findMostRecentTag();
        var ref = yield execHelper(ARGS('git show-ref ' + tag), true);
        console.log('    ' + repo.repoName + ': ' + tag.replace(/^r/, '') + ' (' + ref.slice(0, 10) + ')');
    });
}

function *listReleaseUrls(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    opt = opt
        .options('version', {
            desc: 'The version of the release. E.g. 2.7.1-rc2',
            demand: true
         })
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('.\n' +
               'Usage: $0 list-release-urls')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);
    var version = argv['version'];

    var baseUrl = 'http://git-wip-us.apache.org/repos/asf?p=%s.git;a=shortlog;h=refs/tags/%s';
    yield forEachRepo(repos, function*(repo) {
        if (!(yield tagExists(version))) {
            console.error('Tag "' + version + '" does not exist in repo ' + repo.repoName);
            return;
        }
        var url = require('util').format(baseUrl, repo.repoName, version);
        console.log(url);
        yield execHelper(ARGS('git show-ref ' + version), 2, true);
    });
}

function *localBranchExists(name) {
    return !!(yield execHelper(ARGS('git branch --list ' + name), true));
}

function *remoteBranchExists(repo, name) {
    return !!(yield execHelper(ARGS('git branch -r --list ' + repo.remoteName + '/' + name), true));
}

function *retrieveCurrentBranchName(allowDetached) {
    var ref = yield execHelper(ARGS('git symbolic-ref HEAD'), true, true);
    if (!ref) {
        if (allowDetached) {
            return null;
        }
        throw new Error('Aborted due to repo ' + shjs.pwd() + ' not being on a named branch');
    }
    var match = /refs\/heads\/(.*)/.exec(ref);
    if (!match) {
        throw new Error('Could not parse branch name from: ' + ref);
    }
    return match[1];
}

function findMostRecentTag() {
    return execHelper(ARGS('git describe --tags --abbrev=0 HEAD'), true);
}

function retrieveCurrentTagName() {
    // This will return the tag name plus commit info it not directly at a tag.
    // That's fine since all users of this function are meant to use the result
    // in an equality check.
    return execHelper(ARGS('git describe --tags HEAD'), true, true);
}

function *tagExists(tagName) {
    return !!(yield execHelper(ARGS('git tag --list ' + tagName), true));
}

function *listReposCommand(argv) {
    console.log('Valid values for the --repo flag:');
    console.log('');
    console.log('Repositories:');
    repoutil.repoGroups.all.forEach(function(repo) {
        console.log('    ' + repo.id);
    });
    console.log('');
    console.log('Repository Groups:');
    var groupNames = Object.keys(repoutil.repoGroups);
    groupNames.sort();
    groupNames.forEach(function(groupName) {
        console.log('    ' + groupName + ' (' + repoutil.repoGroups[groupName].map(function(repo) { return repo.id }).join(', ') + ')');
    });
    process.exit(0);
}

function *repoCloneCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Clones git repositories into the current working directory. If the repositories are already cloned, then this is a no-op.\n\n' +
               'Usage: $0 clone --repo=name [--repo=othername]')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);
    yield cloneRepos(repos, false);
}

function *cloneRepos(repos, quiet) {
    var failures = [];
    var numSkipped = 0;

    for (var i = 0; i < repos.length; ++i) {
        var repo = repos[i];
        if (shjs.test('-d', repo.repoName)) {
            if(!quiet) print('Repo already cloned: ' + repo.repoName);
            numSkipped +=1 ;
        } else if (repo.svn) {
            yield execHelper(ARGS('svn checkout ' + repo.svn + ' ' + repo.repoName));
        } else {
            yield execHelper(ARGS('git clone --progress ' + createRepoUrl(repo)));
        }
    }

    var numCloned = repos.length - numSkipped;
    if (numCloned) {
        print('Successfully cloned ' + numCloned + ' repositories.');
    }
}

function *repoStatusCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    var opt = optimist
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to report on. Can be specified multiple times to specify multiple branches. The local version of the branch is compared with the origin\'s version unless --b2 is specified.'
         })
        .options('branch2', {
            desc: 'The name of the branch to diff against. This is origin/$branch by default.'
         })
        .options('diff', {
            desc: 'Show a diff of the changes.',
            default: false
         })
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Reports what changes exist locally that are not yet pushed.\n' +
               '\n' +
               'Example usage: $0 repo-status -r auto -b master -b 2.9.x\n' +
               'Example usage: $0 repo-status -r plugins -b dev --branch2 master --diff')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var branches = argv.b && (Array.isArray(argv.b) ? argv.b : [argv.b]);
    var branches2 = branches && argv.branch2 && (Array.isArray(argv.branch2) ? argv.branch2 : [argv.branch2]);
    var repos = flagutil.computeReposFromFlag(argv.r);

    if (branches2 && branches && branches.length != branches2.length) {
        apputil.fatal('Must specify the same number of --branch and --branch2 flags');
    }

    yield forEachRepo(repos, function*(repo) {
        if (repo.svn) {
            print('repo-status not implemented for svn repos');
            return;
        }
        // Determine remote name.
        yield updateRepos([repo], [], true);
        var actualBranches = branches ? branches : /^plugin/.test(repo.id) ? ['dev', 'master'] : ['master'];
        for (var i = 0; i < actualBranches.length; ++i) {
            var branchName = actualBranches[i];
            if (!(yield localBranchExists(branchName))) {
                continue;
            }
            var targetBranch = branches2 ? branches2[i] : ((yield remoteBranchExists(repo, branchName)) ? repo.remoteName + '/' + branchName : 'master');
            var changes = yield execHelper(ARGS('git log --no-merges --oneline ' + targetBranch + '..' + branchName), true);
            if (changes) {
                print('Local commits exist on ' + branchName + ':');
                console.log(changes);
            }
        }
        var gitStatus = yield execHelper(ARGS('git status --short'), true);
        if (gitStatus) {
            print('Uncommitted changes:');
            console.log(gitStatus);
        }
    });
    if (argv.diff) {
        yield forEachRepo(repos, function*(repo) {
            var actualBranches = branches ? branches : [/^plugin/.test(repo.id) ? 'dev' : 'master'];
            for (var i = 0; i < actualBranches.length; ++i) {
                var branchName = actualBranches[i];
                if (!(yield localBranchExists(branchName))) {
                    return;
                }
                var targetBranch = branches2 ? branches2[i] : ((yield remoteBranchExists(repo, branchName)) ? repo.remoteName + '/' + branchName : 'master');
                var diff = yield execHelper(ARGS('git diff ' + targetBranch + '...' + branchName), true);
                if (diff) {
                    print('------------------------------------------------------------------------------');
                    print('Diff for ' + repo.repoName + ' on branch ' + branchName + ' (vs ' + targetBranch + ')');
                    print('------------------------------------------------------------------------------');
                    console.log(diff);
                    console.log('\n');
                }
            }
        });
    }
}

function *repoResetCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    var opt = optimist
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to reset. Can be specified multiple times to specify multiple branches.',
            default: 'master'
         });
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Resets repository branches to match their upstream state.\n' +
               'Performs the following commands on each:\n' +
               '    git reset --hard origin/$BRANCH_NAME\n' +
               '    git clean -f -d\n' +
               '    if ($BRANCH_NAME exists only locally) then\n' +
               '        git branch -D $BRANCH_NAME\n' +
               '\n' +
               'Usage: $0 repo-reset -r auto -b master -b 2.9.x')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var branches = Array.isArray(argv.b) ? argv.b : [argv.b];
    var repos = flagutil.computeReposFromFlag(argv.r);

    function *cleanRepo(repo) {
        for (var i = 0; i < branches.length; ++i) {
            var branchName = branches[i];
            if (!(yield localBranchExists(branchName))) {
                continue;
            }
            if (yield remoteBranchExists(repo, branchName)) {
                yield gitCheckout(branchName);
                var changes = yield execHelper(ARGS('git log --oneline ' + repo.remoteName + '/' + branchName + '..' + branchName));
                if (changes) {
                    print(repo.repoName + ' on branch ' + branchName + ': Local commits exist. Resetting.');
                    yield execHelper(ARGS('git reset --hard ' + repo.remoteName + '/' + branchName));
                } else {
                    print(repo.repoName + ' on branch ' + branchName + ': No local commits to reset.');
                }
            } else {
                if ((yield retrieveCurrentBranchName()) == branchName) {
                    yield gitCheckout('master');
                }
                print(repo.repoName + ' deleting local-only branch ' + branchName + '.');
                yield execHelper(ARGS('git log --oneline -3 ' + branchName));
                yield execHelper(ARGS('git branch -D ' + branchName));
            }
        }
    }
    yield forEachRepo(repos, function*(repo) {
        // Determine remote name.
        yield updateRepos([repo], [], true);
        var branchName = yield retrieveCurrentBranchName();
        if (branches.indexOf(branchName) == -1) {
            yield stashAndPop(repo, function*() {
                yield cleanRepo(repo);
            });
        } else {
            yield execHelper(ARGS('git clean -f -d'));
            yield cleanRepo(repo);
        }
    });
}

function *repoPushCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    var opt = optimist
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to push. Can be specified multiple times to specify multiple branches.',
            default: ['master', 'dev']
         });
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Pushes changes to the remote repository.\n' +
               '\n' +
               'Usage: $0 repo-push -r auto -b master -b 2.9.x')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var branches = Array.isArray(argv.b) ? argv.b : [argv.b];
    var repos = flagutil.computeReposFromFlag(argv.r);

    yield forEachRepo(repos, function*(repo) {
        // Update first.
        yield updateRepos([repo], branches, false);
        for (var i = 0; i < branches.length; ++i) {
            var branchName = branches[i];
            if (!(yield localBranchExists(branchName))) {
                continue;
            }
            var isNewBranch = !(yield remoteBranchExists(repo, branchName));

            yield gitCheckout(branchName);

            if (isNewBranch) {
                yield execHelper(ARGS('git push --set-upstream ' + repo.remoteName + ' ' + branchName));
            } else {
                var changes = yield execHelper(ARGS('git log --oneline ' + repo.remoteName + '/' + branchName + '..' + branchName), true);
                if (changes) {
                    yield execHelper(ARGS('git push ' + repo.remoteName + ' ' + branchName));
                } else {
                    print(repo.repoName + ' on branch ' + branchName + ': No local commits exist.');
                }
            }
        }
    });
}

function *repoPerformShellCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Performs the supplied shell command in each repo directory.\n' +
               '\n' +
               'Usage: $0 foreach "shell command"')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);
    var cmd = argv._[1];
    yield forEachRepo(repos, function*(repo) {
         yield execHelper(argv._.slice(1), false, true);
    });
}

function *repoUpdateCommand(argv) {
    var opt = flagutil.registerRepoFlag(optimist)
    var opt = opt
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to update. Can be specified multiple times to update multiple branches.',
            default: ['master', 'dev']
         })
        .options('fetch', {
            type: 'boolean',
            desc: 'Use --no-fetch to skip the "git fetch" step.',
            default: true
         });
    opt = flagutil.registerHelpFlag(opt);
    var argv = opt
        .usage('Updates git repositories by performing the following commands:\n' +
               '    save active branch\n' +
               '    git fetch $REMOTE \n' +
               '    git stash\n' +
               '    for each specified branch:\n' +
               '        git checkout $BRANCH\n' +
               '        git rebase $REMOTE/$BRANCH\n' +
               '        git checkout -\n' +
               '    git checkout $SAVED_ACTIVE_BRANCH\n' +
               '    git stash pop\n' +
               '\n' +
               'Usage: $0 repo-update')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var branches = Array.isArray(argv.b) ? argv.b : [argv.b];
    var repos = flagutil.computeReposFromFlag(argv.r);

    // ensure that any missing repos are cloned
    yield cloneRepos(repos,true);
    yield updateRepos(repos, branches, !argv.fetch);
}

function *determineApacheRemote(repo) {
    var fields = (yield execHelper(ARGS('git remote -v'), true)).split(/\s+/);
    var ret = null;
    for (var i = 1; i < fields.length; i += 3) {
        ['git-wip-us.apache.org/repos/asf/', 'git.apache.org/'].forEach(function(validRepo) {
            if (fields[i].indexOf(validRepo + repo.repoName) != -1) {
                ret = fields[i - 1];
            }
        });
    }
    if (ret)
        return ret;
    apputil.fatal('Could not find an apache remote for repo ' + repo.repoName);
}

function *pendingChangesExist() {
    return !!(yield execHelper(ARGS('git status --porcelain'), true));
}

function *stashAndPop(repo, func) {
    var requiresStash = yield pendingChangesExist();
    var branchName = yield retrieveCurrentBranchName();

    if (requiresStash) {
        yield execHelper(ARGS('git stash save --all --quiet', 'coho stash'));
    }

    yield func();

    yield gitCheckout(branchName);
    if (requiresStash) {
        yield execHelper(ARGS('git stash pop'));
    }
}

function *updateRepos(repos, branches, noFetch) {
    // Pre-fetch checks.
    yield forEachRepo(repos, function*(repo) {
        if (repo.svn) {
            return;
        }
        // Ensure it's on a named branch.
        yield retrieveCurrentBranchName();
        // Find the apache remote.
        if (!repo.remoteName) {
            repo.remoteName = yield determineApacheRemote(repo);
        }
    });

    if (!noFetch) {
        yield forEachRepo(repos, function*(repo) {
            if (repo.svn) {
                return;
            }
            // TODO - can these be combined? Fetching with --tags seems to not pull in changes...
            yield execHelper(ARGS('git fetch --progress ' + repo.remoteName));
            yield execHelper(ARGS('git fetch --progress --tags ' + repo.remoteName));
        });
    }

    if (branches && branches.length) {
        yield forEachRepo(repos, function*(repo) {
            if (repo.svn) {
                yield execHelper(ARGS('svn up'));
                return;
            }
            var staleBranches = {};
            for (var i = 0; i < branches.length; ++i) {
                var branchName = branches[i];
                if (yield remoteBranchExists(repo, branches[i])) {
                    var changes = yield execHelper(ARGS('git log --oneline ' + branchName + '..' + repo.remoteName + '/' + branchName), true, true);
                    staleBranches[branchName] = !!changes;
                }
            }
            var staleBranches = branches.filter(function(branchName) {
                return !!staleBranches[branchName];
            });
            if (!staleBranches.length) {
                print('Confirmed already up-to-date: ' + repo.repoName);
            } else {
                print('Updating ' + repo.repoName);
                yield stashAndPop(repo, function*() {
                    for (var i = 0; i < staleBranches.length; ++i) {
                        var branchName = staleBranches[i];
                        yield gitCheckout(branchName);
                        var ret = yield execHelper(ARGS('git rebase ' + repo.remoteName + '/' + branchName), false, true);
                        if (ret === null) {
                            console.log('\n\nUpdate failed. Run again with --no-fetch to try again without re-fetching.');
                            process.exit(1);
                        }
                    }
                });
            }
        });
    }
}

function configureReleaseCommandFlags(opt) {
    var opt = flagutil.registerRepoFlag(opt)
    opt = opt
        .options('version', {
            desc: 'The version to use for the branch. Must match the pattern #.#.#[-rc#]',
            demand: true
         });
    opt = flagutil.registerHelpFlag(opt);
    argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var version = flagutil.validateVersionString(argv.version);
    return argv;
}

var hasBuiltJs = '';

function *updateJsSnapshot(repo, version) {
    function *ensureJsIsBuilt() {
        var cordovaJsRepo = repoutil.getRepoById('js');
        if (hasBuiltJs != version) {
            yield forEachRepo([cordovaJsRepo], function*() {
                yield stashAndPop(cordovaJsRepo, function*() {
                    if (getVersionBranchName(version) == 'master') {
                        yield gitCheckout('master');
                    } else {
                        yield gitCheckout(version);
                    }
                    yield execHelper(ARGS('grunt'));
                    hasBuiltJs = version;
                });
            });
        }
    }

    if (repoutil.repoGroups.platform.indexOf(repo) == -1) {
        return;
    }

    if (repo.cordovaJsPaths) {
        yield ensureJsIsBuilt();
        repo.cordovaJsPaths.forEach(function(jsPath) {
            var src = path.join('..', 'cordova-js', 'pkg', repo.cordovaJsSrcName || ('cordova.' + repo.id + '.js'));
            cpAndLog(src, jsPath);
        });
        if (yield pendingChangesExist()) {
            yield execHelper(ARGS('git commit -am', 'Update JS snapshot to version ' + version + ' (via coho)'));
        }
    } else if (repoutil.repoGroups.all.indexOf(repo) != -1) {
        print('*** DO NOT KNOW HOW TO UPDATE cordova.js FOR THIS REPO ***');
    }
}

function *updateRepoVersion(repo, version) {
    // Update the VERSION files.
    var versionFilePaths = repo.versionFilePaths || ['VERSION'];
    if (fs.existsSync(versionFilePaths[0])) {
        versionFilePaths.forEach(function(versionFilePath) {
            fs.writeFileSync(versionFilePath, version + '\n');
        });
        shjs.config.apputil.fatal = true;
        if (repo.id == 'android') {
            shjs.sed('-i', /CORDOVA_VERSION.*=.*;/, 'CORDOVA_VERSION = "' + version + '";', path.join('framework', 'src', 'org', 'apache', 'cordova', 'CordovaWebView.java'));
            shjs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'templates', 'cordova', 'version'));
        }
        shjs.config.apputil.fatal = false;
        if (!(yield pendingChangesExist())) {
            print('VERSION file was already up-to-date.');
        }
    } else {
        console.warn('No VERSION file exists in repo ' + repo.repoName);
    }

    if (yield pendingChangesExist()) {
        yield execHelper(ARGS('git commit -am', 'Set VERSION to ' + version + ' (via coho)'));
    }
}

function *prepareReleaseBranchCommand() {
    var argv = configureReleaseCommandFlags(optimist
        .usage('Prepares release branches but does not create tags. This includes:\n' +
               '    1. Creating the branch if it doesn\'t already exist\n' +
               '    2. Updating cordova.js snapshot and VERSION file.\n' +
               '\n' +
               'Command is safe to run multiple times, and can be run for the purpose\n' +
               'of checking out existing release branches.\n' +
               '\n' +
               'Command can also be used to update the JS snapshot after release \n' +
               'branches have been created.\n' +
               '\n' +
               'Usage: $0 prepare-release-branch --version=2.8.0-rc1')
    );
    var repos = flagutil.computeReposFromFlag(argv.r);
    var version = flagutil.validateVersionString(argv.version);
    var branchName = getVersionBranchName(version);

    // First - perform precondition checks.
    yield updateRepos(repos, [], true);

    var cordovaJsRepo = repoutil.getRepoById('js');

    // Ensure cordova-js comes first.
    var repoIndex = repos.indexOf(cordovaJsRepo);
    if (repoIndex != -1) {
        repos.splice(repoIndex, 1);
        repos.unshift(cordovaJsRepo);
    }

    yield forEachRepo(repos, function*(repo) {
        yield stashAndPop(repo, function*() {
            // git fetch + update master
            yield updateRepos([repo], ['master'], false);

            // Either create or pull down the branch.
            if (yield remoteBranchExists(repo, branchName)) {
                print('Remote branch already exists for repo: ' + repo.repoName);
                // Check out and rebase.
                yield updateRepos([repo], [branchName], true);
                yield gitCheckout(branchName);
            } else if (yield localBranchExists(branchName)) {
                yield execHelper(ARGS('git checkout ' + branchName));
            } else {
                yield gitCheckout('master');
                yield execHelper(ARGS('git checkout -b ' + branchName));
            }
            yield updateJsSnapshot(repo, version);
            print(repo.repoName + ': ' + 'Setting VERSION to "' + version + '" on branch + "' + branchName + '".');
            yield updateRepoVersion(repo, version);

            yield gitCheckout('master');
            var devVersion = createPlatformDevVersion(version);
            print(repo.repoName + ': ' + 'Setting VERSION to "' + devVersion + '" on branch + "master".');
            yield updateRepoVersion(repo, devVersion);
            yield updateJsSnapshot(repo, devVersion);
            yield gitCheckout(branchName);
        });
    });

    reportGitPushResult(repos, ['master', branchName]);
}

function *tagReleaseBranchCommand(argv) {
    var argv = configureReleaseCommandFlags(optimist
        .usage('Tags a release branches.\n' +
               '\n' +
               'Usage: $0 tag-release --version=2.8.0-rc1')
        .options('pretend', {
            desc: 'Don\'t actually run git commands, just print out what would be run.',
         })
    );
    var repos = flagutil.computeReposFromFlag(argv.r);
    var version = flagutil.validateVersionString(argv.version);
    var pretend = argv.pretend;
    var branchName = getVersionBranchName(version);

    // First - perform precondition checks.
    yield updateRepos(repos, [], true);

    function *execOrPretend(cmd) {
        if (pretend) {
            print('PRETENDING TO RUN: ' + cmd.join(' '));
        } else {
            yield execHelper(cmd);
        }
    }
    yield forEachRepo(repos, function*(repo) {
        yield stashAndPop(repo, function*() {
            // git fetch.
            yield updateRepos([repo], [], false);

            if (yield remoteBranchExists(repo, branchName)) {
                print('Remote branch already exists for repo: ' + repo.repoName);
                yield gitCheckout(branchName);
            } else {
                apputil.fatal('Release branch does not exist for repo ' + repo.repoName);
            }

            // git merge
            yield updateRepos([repo], [branchName], true);

            // Create/update the tag.
            var tagName = yield retrieveCurrentTagName();
            if (tagName != version) {
                if (yield tagExists(version)) {
                    yield execOrPretend(ARGS('git tag ' + version + ' --force'));
                } else {
                    yield execOrPretend(ARGS('git tag ' + version));
                }
                yield execOrPretend(ARGS('git push --tags ' + repo.remoteName + ' ' + branchName));
            } else {
                print('Repo ' + repo.repoName + ' is already tagged.');
            }
        });
    });

    print('');
    print('All work complete.');
}

function *lastWeekCommand() {
    var opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerHelpFlag(opt);
    opt.usage('Shows formatted git log for changes in the past 7 days.\n' +
              '\n' +
              'Usage: $0 last-week [--repo=ios] [--me] [--days=7]\n' +
              '    --me: Show only your commits\n' +
              '    --days=n: Show commits from the past n days');
    argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);
    var filterByEmail = !!argv.me;
    var days = argv.days || 7;
    var userEmail = filterByEmail && (yield execHelper(ARGS('git config user.email'), true));
    var commitCount = 0;
    var pullRequestCount = 0;

    var cmd = ARGS('git log --no-merges --date=short --all-match --fixed-strings');
    if (filterByEmail) {
        cmd.push('--committer=' + userEmail, '--author=' + userEmail);
    }

    print('Running command: ' + cmd.join(' ') + ' --format="$REPO_NAME %s" --since="' + days + ' days ago"');
    yield forEachRepo(repos, function*(repo) {
        var repoName = repo.id + new Array(Math.max(0, 20 - repo.id.length + 1)).join(' ');
        var output = yield execHelper(cmd.concat(['--format=' + repoName + ' %cd %s',
            '--since=' + days + ' days ago']), true);
        if (output) {
            console.log(output);
            commitCount += output.split('\n').length;
        }
    });

    if (filterByEmail) {
        console.log('\nPull requests:');
        cmd = ARGS('git log --no-merges --date=short --fixed-strings', '--committer=' + userEmail);
        yield forEachRepo(repos, function*(repo) {
            var repoName = repo.id + new Array(Math.max(0, 20 - repo.id.length + 1)).join(' ');
            var output = yield execHelper(cmd.concat(['--format=%ae|' + repoName + ' %cd %s',
                '--since=' + days + ' days ago']), true);
            if (output) {
                output.split('\n').forEach(function(line) {
                    line = line.replace(/(.*?)\|/, '');
                    if (RegExp.lastParen.indexOf(userEmail) == -1) {
                        console.log(line);
                        pullRequestCount += 1;
                    }
                });
            }
        });
    }

    console.log('');
    if (filterByEmail) {
        console.log('Total Commits: ' + commitCount + ' Total Pull Requests: ' + pullRequestCount);
    } else {
        console.log('Total Commits: ' + commitCount);
    }
}

function *ratCommand() {
    var opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerHelpFlag(opt);
    opt.usage('Uses Apache RAT to audit source files for license headers.\n' +
              '\n' +
              'Usage: $0 audit-license-headers --repo=ios')
    argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = flagutil.computeReposFromFlag(argv.r);
    // Check that RAT command exists.
    var ratName = 'apache-rat-0.10';
    var ratUrl = "https://dist.apache.org/repos/dist/release/creadur/apache-rat-0.10/apache-rat-0.10-bin.tar.gz";
    var ratPath;
    yield forEachRepo([repoutil.getRepoById('coho')], function*() {
        ratPath = path.join(process.cwd(), ratName, ratName+'.jar');
    });
    if (!fs.existsSync(ratPath)) {
        print('RAT tool not found, downloading to: ' + ratPath);
        yield forEachRepo([repoutil.getRepoById('coho')], function*() {
            if (shjs.which('curl')) {
                yield execHelper(['sh', '-c', 'curl "' + ratUrl + '" | tar xz']);
            } else {
                yield execHelper(['sh', '-c', 'wget -O - "' + ratUrl + '" | tar xz']);
            }
        });
        if (!fs.existsSync(ratPath)) {
            apputil.fatal('Download failed.');
        }
    }
    print('\x1B[31mNote: ignore filters exist and often need updating within coho.\x1B[39m');
    yield forEachRepo(repos, function*(repo) {
        var allExcludes = COMMON_RAT_EXCLUDES;
        if (repo.ratExcludes) {
            allExcludes = allExcludes.concat(repo.ratExcludes);
        }
        var excludeFlags = [];
        allExcludes.forEach(function(e) {
            excludeFlags.push('-e', e);
        });
        yield execHelper(ARGS('java -jar', ratPath, '-d', '.').concat(excludeFlags));
    });
}

function main() {
    var commandList = [
        {
            name: 'repo-clone',
            desc: 'Clones git repositories into the current working directory.',
            entryPoint: repoCloneCommand
        }, {
            name: 'repo-update',
            desc: 'Performs git pull --rebase on all specified repositories.',
            entryPoint: repoUpdateCommand
        }, {
            name: 'repo-reset',
            desc: 'Performs git reset --hard origin/$BRANCH and git clean -f -d on all specified repositories.',
            entryPoint: repoResetCommand
        }, {
            name: 'repo-status',
            desc: 'Lists changes that exist locally but have not yet been pushed.',
            entryPoint: repoStatusCommand
        }, {
            name: 'repo-push',
            desc: 'Push changes that exist locally but have not yet been pushed.',
            entryPoint: repoPushCommand
        }, {
            name: 'list-repos',
            desc: 'Shows a list of valid values for the --repo flag.',
            entryPoint: listReposCommand
        }, {
            name: 'list-pulls',
            desc: 'Shows a list of GitHub pull requests for all specified repositories.',
            entryPoint: require('./list-pulls')
        }, {
            name: 'prepare-release-branch',
            desc: 'Branches, updates JS, updates VERSION. Safe to run multiple times.',
            entryPoint: prepareReleaseBranchCommand
        }, {
            name: 'tag-release',
            desc: 'Tags repos for a release.',
            entryPoint: tagReleaseBranchCommand
        }, {
            name: 'audit-license-headers',
            desc: 'Uses Apache RAT to look for missing license headers.',
            entryPoint: ratCommand
        }, {
            name: 'create-release-bug',
            desc: 'Creates a bug in JIRA for tracking the tasks involved in a new release',
            entryPoint: require('./create-release-bug')
        }, {
            name: 'create-archive',
            desc: 'Zips up a tag, signs it, and adds checksum files.',
            entryPoint: createArchiveCommand
        }, {
            name: 'verify-archive',
            desc: 'Checks that archives are properly signed and hashed.',
            entryPoint: verifyArchiveCommand
        }, {
            name: 'print-tags',
            desc: 'Prints out tags & hashes for the given repos. Used in VOTE emails.',
            entryPoint: printTagsCommand
        }, {
            name: 'last-week',
            desc: 'Prints out git logs of things that happened last week.',
            entryPoint: lastWeekCommand
        }, {
            name: 'foreach',
            desc: 'Runs a shell command in each repo.',
            entryPoint: repoPerformShellCommand
        }, {
            name: 'list-release-urls',
            desc: 'List the apache git repo urls for release artifacts.',
            entryPoint: listReleaseUrls
        }
    ];
    var commandMap = {};
    for (var i = 0; i < commandList.length; ++i) {
        commandMap[commandList[i].name] = commandList[i];
    }
    var usage = 'Usage: $0 command [options]\n' +
               '\n' +
               'Valid commands:\n';
    for (var i = 0; i < commandList.length; ++i) {
        usage += '    ' + commandList[i].name + ': ' + commandList[i].desc + '\n';
    }
    usage += '\nFor help on a specific command: $0 command --help\n\n';
    usage += 'Some examples:\n';
    usage += '    ./cordova-coho/coho repo-clone -r plugins -r mobile-spec -r android -r ios -r cli\n';
    usage += '    ./cordova-coho/coho repo-update\n';
    usage += '    ./cordova-coho/coho foreach -r plugins "git checkout master"\n';
    usage += '    ./cordova-coho/coho foreach -r plugins "git clean -fd"\n';
    usage += '    ./cordova-coho/coho last-week --me';

    var command;
    var argv = optimist
        .usage(usage)
        .check(function(argv) {
            command = argv._[0];
            if (!command) {
                throw 'No command specified.';
            }
            if (!commandMap[command]) {
                throw 'Unknown command: ' + command;
            }
        }).argv;

    var entry = commandMap[command].entryPoint;
    co(entry)();
}
main();
