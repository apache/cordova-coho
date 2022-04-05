/**
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

const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const Q = require('q');
const shell = require('shelljs');
const iswin32 = process.platform === 'win32';

function extend (dst, src) {
    for (const k in src) {
        dst[k] = src[k];
    }
    return dst;
}

// On Windows, spawn() for batch files requires absolute path & having the extension.
function resolveWindowsExe (cmd) {
    const winExtensions = ['.exe', '.cmd', '.bat', '.js', '.vbs'];
    function isValidExe (c) {
        return winExtensions.indexOf(path.extname(c)) !== -1 && fs.existsSync(c);
    }
    if (isValidExe(cmd)) {
        return cmd;
    }
    cmd = shell.which(cmd) || cmd;
    if (!isValidExe(cmd)) {
        winExtensions.some(function (ext) {
            if (fs.existsSync(cmd + ext)) {
                cmd = cmd + ext;
                return true;
            }
        });
    }
    return cmd;
}

function maybeQuote (a) {
    if (a.indexOf(' ') !== -1) {
        a = '"' + a + '"';
    }
    return a;
}

// opts:
//   printCommand: Whether to log the command (default: false)
//   stdio: 'default' is to capture output and returning it as a string to success (same as exec)
//          'ignore' means don't bother capturing it
//          'inherit' means pipe the input & output. This is required for anything that prompts.
//   env: Map of extra environment variables.
//   cwd: Working directory for the command.
// Returns a promise that succeeds only for return code = 0.
exports.spawn = function (cmd, args, opts) {
    args = args || [];
    opts = opts || {};
    const spawnOpts = {};
    const d = Q.defer();

    if (iswin32) {
        cmd = resolveWindowsExe(cmd);
        // If we couldn't find the file, likely we'll end up failing,
        // but for things like "del", cmd will do the trick.
        if (path.extname(cmd) !== '.exe' && cmd.indexOf(' ') !== -1) {
            // We need to use /s to ensure that spaces are parsed properly with cmd spawned content
            args = [['/s', '/c', '"' + [cmd].concat(args).map(function (a) { if (/^[^"].* .*[^"]/.test(a)) return '"' + a + '"'; return a; }).join(' ') + '"'].join(' ')];
            cmd = 'cmd';
            spawnOpts.windowsVerbatimArguments = true;
        } else if (!fs.existsSync(cmd)) {
            // We need to use /s to ensure that spaces are parsed properly with cmd spawned content
            args = ['/s', '/c', cmd].concat(args);
        }
    }

    const pipeOutput = opts.stdio === 'inherit';
    if (opts.stdio === 'ignore') {
        spawnOpts.stdio = 'ignore';
    } else if (pipeOutput) {
        spawnOpts.stdio = [process.stdin, 'pipe', process.stderr];
    } else {
        spawnOpts.stdio = [process.stdin, 'pipe', 'pipe'];
    }
    if (opts.cwd) {
        spawnOpts.cwd = opts.cwd;
    }
    if (opts.env) {
        spawnOpts.env = extend(extend({}, process.env), opts.env);
    }

    if (opts.printCommand) {
        console.log('Running command: ' + maybeQuote(cmd) + ' ' + args.map(maybeQuote).join(' '));
    }

    const child = child_process.spawn(cmd, args, spawnOpts);
    let capturedOut = '';
    let capturedErr = '';

    if (child.stdout) {
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', function (data) {
            capturedOut += data;
            if (pipeOutput) {
                process.stdout.write(data);
            }
        });
    }
    if (child.stderr) {
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', function (data) {
            capturedErr += data;
        });
    }

    child.on('close', whenDone);
    child.on('error', whenDone);
    function whenDone (arg) {
        child.removeListener('close', whenDone);
        child.removeListener('error', whenDone);
        const code = typeof arg === 'number' ? arg : arg && arg.code;

        if (code === 0) {
            d.resolve(capturedOut.trim());
        } else {
            let errMsg = cmd + ': Command failed with exit code ' + code;
            if (capturedErr) {
                errMsg += ' Error output:\n' + capturedErr.trim();
            }
            const err = new Error(errMsg);
            err.code = code;
            err.output = capturedOut.trim();
            d.reject(err);
        }
    }

    return d.promise;
};
