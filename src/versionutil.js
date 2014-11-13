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
var repoutil = require('./repoutil');
var flagutil = require('./flagutil');
var path = require('path');

function removeDev(version) {
    var newVersion = version.replace('-dev', '');
    return newVersion;
}
exports.removeDev = removeDev;

//updates platformsConfig.json
//Needs to be passed a object which includes repo.id as key 
//and the new version as value
//ex {android:4.0.0}
function *updatePlatformsConfig(newValues) {
    
    var platformsConfig = path.join(repoutil.getRepoDir('cordova-lib'), 
        'src/cordova/platformsConfig.json');
    console.log(platformsConfig);
    var platformsJS = require(platformsConfig);

    var repos = flagutil.computeReposFromFlag('active-platform');

    yield repoutil.forEachRepo(repos, function*(repo) {
        if(repo.id === 'windowsphone'){
            platformsJS['wp8'].version = newValues[repo.id]; 
        } else if(repo.id === 'windows') {
            platformsJS[repo.id].version = newValues[repo.id];     
            platformsJS['windows8'].version = newValues[repo.id]; 
        } else if(repo.id === 'blackberry') {
            platformsJS['blackberry10'].version = newValues[repo.id]; 
        } else {
            platformsJS[repo.id].version = newValues[repo.id]; 
        }
    });

    fs.writeFileSync(platformsConfig, JSON.stringify(platformsJS, null, 4), 'utf8', function(err) {
        if (err) return console.log (err);
    });
}
exports.updatePlatformsConfig = updatePlatformsConfig;
