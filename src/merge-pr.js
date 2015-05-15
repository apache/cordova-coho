
var flagutil = require('./flagutil');
var optimist = require('optimist');
var shelljs = require('shelljs');
var executil = require('./executil');
var gitutil = require('./gitutil');
var superspawn = require('./superspawn');

module.exports = function *(argv) {
    var opt = flagutil.registerHelpFlag(optimist);
    opt.options('pr', {
            desc: 'PR # that needs to be merged',
            demand: true
        }).options('remote', {
           desc: 'Named remote for the github apache mirror',
           demand: true  
        }).options('pretend', {
            desc: 'Don\'t actually run commands, just print what would be run.',
            type:'boolean'
        });
    argv = opt
        .usage('Merges the pull request to master\n' +
        '\n' +
        'Usage: $0 merge-pr --pr 111 --remote mirror')
        .argv;
   if (argv.h) {
        optimist.showHelp();
        process.exit(1);
   }
   yield gitutil.stashAndPop("", function*() {
       yield executil.execOrPretend(executil.ARGS('git checkout master'), argv.pretend);
    
       yield executil.execOrPretend(executil.ARGS('git pull origin master'), argv.pretend);
       
       yield executil.execOrPretend(['git', 'fetch', '-fu', argv.remote,
            'refs/pull/' + argv.pr + '/head:pr/' + argv.pr], argv.pretend);
    
       try {
            yield executil.execHelper(executil.ARGS('git merge --ff-only pr/' + argv.pr),
                /*silent*/ true, /*allowError*/ true, argv.pretend);
       } catch (e) {   
           if (e.message.indexOf('fatal: Not possible to fast-forward, aborting.') > 0) {
               // Let's try to rebase
               yield executil.execOrPretend(executil.ARGS('git checkout pr/' + argv.pr), argv.pretend);
               
               yield executil.execOrPretend(executil.ARGS('git pull --rebase origin master'), argv.pretend);
               
               yield executil.execOrPretend(executil.ARGS('git checkout master'), argv.pretend);
               
               yield executil.execOrPretend(executil.ARGS('git merge --ff-only pr/' + argv.pr), argv.pretend);
               
               var commitMessage = yield executil.execOrPretend(executil.ARGS('git log --format=%B -n 1 HEAD'), 
                    argv.pretend);
               
               yield executil.execOrPretend(['git', 'commit', '--amend', '-m',  
                    commitMessage + ' This closes #' + argv.pr], argv.pretend);
           } else {
               throw e;
           }
       }
   });  
};