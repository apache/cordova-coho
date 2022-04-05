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

const nlf = require('nlf');
const treeify = require('treeify');
const optimist = require('optimist');
const fs = require('fs');
const path = require('path');
const Q = require('q');
const flagutil = require('./flagutil');

const jsonObject = {};
let validLicenses = [];
let knownIssues = {};
const licensesFile = path.join('cordova-coho', 'src', 'validLicenses.json');
const knownIssuesFile = path.join('cordova-coho', 'src', 'knownIssues.json');
const reposWithDependencies = [];
const flagged = [];

module.exports = function * () {
    let opt = flagutil.registerRepoFlag(optimist);
    opt = flagutil.registerHelpFlag(opt);
    const argv = opt
        .usage('Go through each specified repo and check the licenses of node modules that are 3rd-party dependencies.\n\n' +
               'Usage: $0 check-license --repo=name [-r repos]')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    const repos = flagutil.computeReposFromFlag(argv.r, { includeModules: true });
    checkLicense(repos);
};

function getRepoLicense (repoName) {
    return Q.nfapply(nlf.find, [{
        directory: path.join(process.cwd(), repoName)
    }
    ]).then(function (p) {
        return p;
    });
}

function checkLicense (repos) {
    // get the license info for each repo's dependencies and sub-dependencies
    const results = [];
    let previous = Q.resolve();
    repos.forEach(function (repo) {
        previous = previous.then(function () {
            const packageDir = findPackageDir(repo);
            if (packageDir) {
                reposWithDependencies.push(repo.id);
                return getRepoLicense(packageDir);
            } else {
                Q.resolve('Repo directory does not exist: ' + repos.repoName + '. First run coho repo-clone.'); // don't end execution if repo doesn't have dependencies or doesn't exist
            }
        }).then(function (data) {
            results.push(data); // push the result of this repo to the results array for later processing
        });
    });

    // process the results after the licenses for all repos have been retrieved
    previous.then(function (result) {
        processResults(results, repos);
    }, function (err) {
        console.log(err);
    });
}

function findPackageDir (repo) {
    let packageDir = repo.repoName;
    if (repo.path) {
        packageDir = path.join(packageDir, repo.path);
    }
    return fs.existsSync(path.join(packageDir, 'package.json')) ? packageDir : null;
}

// process the results of each repo
function processResults (results, repos) {
    // get valid licenses file to flag packages
    validLicenses = fs.readFileSync(licensesFile, 'utf8');
    if (!validLicenses) {
        console.log('No valid licenses file. Please make sure it exists.');
        return;
    }
    validLicenses = (JSON.parse(validLicenses)).validLicenses;

    // get known issues file to report known package issues
    knownIssues = fs.readFileSync(knownIssuesFile, 'utf8');
    if (!knownIssues) {
        console.log('No known issues file. Please make sure it exists.');
        return;
    }
    knownIssues = JSON.parse(knownIssues);

    // go through each repo, get its dependencies and add to json object
    for (let i = 0; i < results.length; ++i) {
        const repo = repos[i];
        if (reposWithDependencies.indexOf(repo.id) > -1) {
            const repoJsonObj = {};
            repoJsonObj.dependencies = getDependencies(results[i]);
            let repoIdentifier = repo.repoName;
            if (repo.path) {
                repoIdentifier += '/' + repo.path;
            }
            jsonObject[repoIdentifier] = repoJsonObj;
        }
    }

    // output results (license info for all packages + list of flagged packages)
    console.log('Below is the license info for all the packages');
    console.log(treeify.asTree(jsonObject, true));
    console.log('\n***********************************************************************************************************************');
    console.log('***********************************************************************************************************************');
    console.log('***********************************************************************************************************************\n');
    if (flagged.length) {
        for (let j = 0; j < flagged.length; ++j) {
            if (knownIssues[flagged[j].name]) {
                flagged[j]['known-issues'] = knownIssues[flagged[j].name];
            }

            console.log(treeify.asTree(flagged[j], true));
        }
        console.log(flagged.length + ' packages were flagged. Please verify manually that the licenses are valid. See those packages above, and update knownIssues.json with your findings, if applicable.');
    } else {
        console.log('No packages were flagged.');
    }
}

// get dependencies for a repo
function getDependencies (packages) {
    const dependencies = [];
    for (let j = 0; j < packages.length; ++j) {
        // pull out only relevant info and add to dependencies array
        const obj = {};
        obj.name = packages[j].name;
        obj.id = packages[j].id;
        obj.directory = [packages[j].directory];
        obj.licenses = packages[j].licenseSources.package.sources;
        dependencies.push(obj);

        // flag any packages whose licenses may not be compatible
        if (!hasValidLicense(obj)) {
            let hadDuplicate = false;

            // avoid duplicating already flagged packages
            for (let z = 0; z < flagged.length; ++z) {
                if (flagged[z].id === obj.id) {
                    hadDuplicate = true;

                    // if it is already flagged then just add the directory to the directories array
                    flagged[z].directory = flagged[z].directory.concat(obj.directory);
                    break;
                }
            }

            if (!hadDuplicate) {
                flagged.push(JSON.parse(JSON.stringify(obj)));
            }
        }
    }

    return dependencies;
}

// check if package has valid licenses
function hasValidLicense (pkg) {
    let isValid = false;

    if (pkg.licenses.length === 0) { return isValid; } else {
        // go through each license of the package
        for (let x = 0; x < pkg.licenses.length; ++x) {
            isValid = false;

            // go through valid licenses and try to match with package license
            for (let y = 0; y < validLicenses.length; ++y) {
                const pattern = new RegExp(validLicenses[y], 'gi'); // construct regular expression from valid license
                if ((pkg.licenses[x].license).match(pattern)) { // match it against the package license
                    isValid = true;
                }
            }

            // shortcut - if one license isn't valid then go ahead and flag it
            if (isValid === false) { break; }
        }
    }

    return isValid;
}
