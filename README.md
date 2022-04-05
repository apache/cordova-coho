<!--
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#  KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
-->

[![Node CI](https://github.com/apache/cordova-coho/workflows/Node%20CI/badge.svg?branch=master)](https://github.com/apache/cordova-coho/actions?query=branch%3Amaster)
[![codecov.io](https://codecov.io/github/apache/cordova-coho/coverage.svg?branch=master)](https://codecov.io/github/apache/cordova-coho?branch=master)


# Cordova Coho

> Command line tool for Apache Cordova contributors to manage [Apache Cordova](http://cordova.apache.org) repositories, and to help with releases and pull requests.

This repository has the following purposes:

1. To hold committer-relevant [documentation](docs/)
2. To hold release automation scripts
   - e.g. `coho create-archive && coho verify-archive`
3. To hold generally useful dev scripts
   - e.g. `coho repo-clone`
   - e.g. `coho --help`

## Node.js is a pre-requisite:

Easiest way on OS X & Linux: 
    [https://github.com/creationix/nvm](https://github.com/creationix/nvm)

Easiest way on Windows:
    [http://nodejs.org/](http://nodejs.org/)

## Installation

### Via `npm`

```bash    
npm install -g cordova-coho
coho
```    

On Mac OS X / Linux, if you didn't use a node version manager like `nvm` or `n`, you might have to run the command using `sudo`.    

### Alternately, you could also clone & use `coho`

```bash
mkdir -p cordova
cd cordova
git clone https://github.com/apache/cordova-coho
cd cordova-coho
npm install
npm link # Might need sudo for some configurations
coho
```

Or you can just call coho directly in your clone:
```bash
C:\Projects\Cordova\cordova-coho\coho.cmd
```

## Cloning/Updating Cordova repositories

```bash
coho repo-update -g -r all
```

`repo-update` will clone a repo if it is missing -- if it exists, it updates it.

The `all` repo id will clone **all** Apache Cordova repositories into the current working directory. 

## Docs

    coho --help

or if you know the command:


    coho [command] --help   

For example:

    coho repo-clone --help

To see valid repo ids and repo group ids for use with Coho, use the `list-repos` command:

    coho list-repos    

### Note about global context

By default `coho` is executed in the parent of where it is installed or checked out (since coho was originally designed for use in another context where this was needed). To work in a global context, meaning the current folder where you are executing `coho`, most commands require you to use the `-g` or `--global` flag. To make this more obvious, all commands first output their current working directory: `Running from ...`.

## Contributing

Cordova is an open source Apache project and contributors are needed to keep this project moving forward. Learn more on 
[how to contribute on our website](https://cordova.apache.org/contribute). 
