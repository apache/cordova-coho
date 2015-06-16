var test = require('tape');
var flagutil = require('../src/flagutil');

test('test computeReposFromFlag', function(t) {
    t.plan(4);

    //console.log(flagutil.computeReposFromFlag('android'))
    var repo = flagutil.computeReposFromFlag('android');
    t.equal(repo.length, 1);
    t.equal(typeof repo[0], 'object');
    t.equal(repo[0].id, 'android');
    t.equal(repo[0].repoName, 'cordova-android');
});
