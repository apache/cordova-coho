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
var apputil = require('./apputil');
var executil = require('./executil');
var flagutil = require('./flagutil');
var gitutil = require('./gitutil');
var repoutil = require('./repoutil');
var repoupdate = require('./repo-update');
var retrieveSha = require('./retrieve-sha');
var print = apputil.print;
var fs = require('fs');
var path = require('path');

module.exports = function*() {
    var repos = flagutil.computeReposFromFlag('nightly');    
    console.log(repos);
    //Update Repos
    yield repoupdate.updateRepos(repos, []);

    var SHAJSON = yield retrieveSha(repos);

    //console.log(SHAJSON['android']);
    //save SHAJSON in cordova-cli repo

    //Update platforms at cordova-lib/src/cordova/platforms.js
    //console.log(repos);
    var cordovaLib = repoutil.getRepoById('lib');
    //Need to run forEachRepo 
    yield repoutil.forEachRepo([cordovaLib], function*() {
        //need to get the path to cordova-lib using executil
        var cordovalibdir = yield executil.execHelper(executil.ARGS('pwd'), true, true);
        yield updatePlatformsFile(path.join(cordovalibdir, 'cordova-lib/src/cordova/platforms.js'), SHAJSON);
    });

}

//updates platforms.js with the SHA
function *updatePlatformsFile(file, shajson){
    platformsJS = require(file);
    var repos = flagutil.computeReposFromFlag('active-platform');
    //console.log(platformsJS);
    yield repoutil.forEachRepo(repos, function*(repo) {
        console.log(repo);
        if(repo.id === 'windowsphone'){
            platformsJS['wp8'].version = shajson[repo.id]; 
        } else if(repo.id === 'windows') {
            platformsJS[repo.id].version = shajson[repo.id];     
            platformsJS['windows8'].version = shajson[repo.id]; 
        } else if(repo.id === 'blackberry') {
            platformsJS['blackberry10'].version = shajson[repo.id]; 
        } else {
            platformsJS[repo.id].version = shajson[repo.id]; 
        }
    });

    fs.readFile(file, 'utf8', function (err, data) {
    if (err) {
        console.log(err);
    }
    var result = data.replace(/(({(.\n)*(.|\n)*)version:\s[\d\w'.]*(\n)(.)*(\n)})/g, JSON.stringify(platformsJS, null, 4));
    
    fs.writeFile(file, result, 'utf8', function(err) {
        if (err) return console.log (err);
    });

    }); 
}

