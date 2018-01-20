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

[![Build Status](https://travis-ci.org/apache/cordova-coho.svg?branch=master)](https://travis-ci.org/apache/cordova-coho)
[![Build Status](https://ci.appveyor.com/api/projects/status/1y9yh5ys72h6l5sy)](https://ci.appveyor.com/project/stumped2/cordova-coho)

# Cordova Coho

> Command line tool for Apache Cordova contributors to manage [Apache Cordova](http://cordova.apache.org) repositories, and to help with releases and pull requests.

This repository has the following purposes:

1. To hold committer-relevant [documentation](docs/index.md)
2. To hold release automation scripts
   - e.g. `coho create-archive && coho verify-archive`
   - e.g. CrowdIn scripts
3. To hold generally useful dev scripts
   - e.g. `coho repo-clone`
   - e.g. `coho --help`

## Node.js is a pre-requisite:

Easiest way on OS X & Linux: 
    [https://github.com/creationix/nvm](https://github.com/creationix/nvm)

Easiest way on Windows:
    [http://nodejs.org/](http://nodejs.org/)

## Installation

```bash    
npm install -g cordova-coho
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
```

## Cloning/Updating Cordova repositories

```bash
mkdir cordova-repos
cd cordova-repos
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

Note that for some commands you may need to use the `-g` or `--global` flag to work in an npm global context, since coho was originally designed for use in another context.

## Contributing
Cordova is an open source Apache project and contributors are needed to keep this project moving forward. Learn more on 
[how to contribute on our website][contribute]. 

### Issues

If you find issues with this tool, please follow our guidelines for [reporting issues]. 
We do not use the GitHub issue system as an Apache project, we have a JIRA issue management system which covers over 50+ CLI, platform, and plugin repos in the Cordova project. Use the "cordova-coho" component for Cordova Coho issues.

[Contribute]: http://cordova.apache.org/contribute/
[Reporting issues]: http://cordova.apache.org/contribute/issues.html
