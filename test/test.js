try {
    eval('(function*(){})');
} catch (e) {
    try {
        require('gnode'); // Enable generators support
    } catch (e) {
        console.log('Please run "npm install" from this directory:\n\t' + __dirname);
        process.exit(2);
    }
}

require('tape-runner')()
