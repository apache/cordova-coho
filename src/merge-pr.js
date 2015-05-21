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

var flagutil = require('./flagutil');
var optimist = require('optimist');
var shelljs = require('shelljs');
var executil = require('./executil');
var gitutil = require('./gitutil');
var superspawn = require('./superspawn');
var chalk = require('chalk');
var repoutil = require('./repoutil');

module.exports = function *(argv) {
    var opt = flagutil.registerHelpFlag(optimist);
    opt.options('pr', {
            desc: 'PR # that needs to be merged',
            demand: true
        });
    argv = opt
        .usage('Merges the pull request to master\n' +
        '\n' +
        'Usage: $0 merge-pr --pr 111')
        .argv;
   if (argv.h) {
        optimist.showHelp();
        process.exit(1);
   }
   
   var localBranch = 'pr/' + argv.pr;
   var currentRepo = repoutil.getRepoById(repoutil.resolveCwdRepo());
   var remote = 'https://github.com/apache/' + currentRepo.repoName;
   var origin = 'https://git-wip-us.apache.org/repos/asf/' + currentRepo.repoName;
   yield gitutil.stashAndPop('', function*() {
       yield executil.execHelper(executil.ARGS('git checkout master'));
    
       var commit = yield executil.execHelper(executil.ARGS('git rev-parse HEAD'), /*silent*/ true);
       //var afterStartingCommit = new Date(startingCommitDate.valueOf() + 1); /* add 1 ms*/

       yield executil.execHelper(['git', 'pull', origin, 'master']);
       yield executil.execHelper(['git', 'fetch', /*force update*/ '-fu', remote,
            'refs/pull/' + argv.pr + '/head:' + localBranch]);
       try {
            yield executil.execHelper(executil.ARGS('git merge --ff-only ' + localBranch),
                /*silent*/ true, /*allowError*/ true);
       } catch (e) {   
           if (e.message.indexOf('fatal: Not possible to fast-forward, aborting.') > 0) {
               // Let's try to rebase
               yield executil.execHelper(executil.ARGS('git checkout ' + localBranch));
               yield executil.execHelper(['git', 'pull', '--rebase', origin, 'master']);
               yield executil.execHelper(executil.ARGS('git checkout master'));
               yield executil.execHelper(executil.ARGS('git merge --ff-only ' + localBranch));
               var commitMessage = yield executil.execHelper(executil.ARGS('git log --format=%B -n 1 HEAD'), /*silent*/ true);
               yield executil.execHelper(['git', 'commit', '--amend', '-m', 
                    commitMessage + '. This closes #' + argv.pr]);
           } else {
               throw e;
           }
       }
      console.log(); 
      var commits =  yield executil.execHelper(['git', 'log',
            '--graph',
            '--pretty=format:%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset',
            '--abbrev-commit',
            '--stat',
            commit + '..HEAD'], /*silent*/ true);

       if (commits) {
           console.log('---------------');
           console.log('Commits merged:');
           console.log('---------------');
           console.log(commits);
           console.log(chalk.red.bold('Please test, squash, and rebase to meaningful commits before pushing. '));
       } else {
           console.log(chalk.red.bold('Nothing to merge - Has this already been merged?'));
       }
   });
};