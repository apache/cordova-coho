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

# COHO

This repository has the following purposes:

1. To hold committer-relevant [documentation](docs/index.md)

2. To hold release automation scripts
  - e.g. coho create-archive && coho verify-archive
  - e.g. CrowdIn scripts

3. To hold generally useful dev scripts
  - e.g. coho repo-clone
  - e.g. coho --help

## How to Clone & Use `coho`

    mkdir -p cordova
    cd cordova
    git clone https://git-wip-us.apache.org/repos/asf/cordova-coho.git
    cd cordova-coho
    npm install
    sudo npm link
    coho --help

## How to Install Node:

Easiest way on OS X & Linux: https://github.com/creationix/nvm

Easiest way on Win: http://nodejs.org/

