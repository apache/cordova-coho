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

# Setting up `gpg`

- [Creating a PGP key for Releases](#creating-a-pgp-key-for-releases)
  * [Installation](#installation)
  * [Create a key](#create-a-key)
  * [Get Key ID](#get-key-id)
  * [Publish Key](#publish-key)
- [Importing PMC Members' PGP keys](#importing-pmc-members-pgp-keys)

## Creating a PGP key for Releases

- You need a PGP key to sign releases for Apache Cordova. 
- [GnuPG, short `gpg`](http://www.apache.org/dev/openpgp.html#gnupg) is the Apache recommended client to create and manage these keys.
- PGP, GPG, GnuPG, OpenPGP can be confusing - [read about the background](https://www.goanywhere.com/blog/2013/07/18/openpgp-pgp-gpg-difference)

### Installation

On a Mac:

    brew install gpg

On Windows:

    ???

### Create a key

Create a new key with 

 * email = you@apache.org
 * description = "CODE SIGNING KEY"
 
Use this command

    gpg --gen-key

(more elaborate instructions at http://www.apache.org/dev/openpgp.html#generate-key + http://www.apache.org/dev/openpgp.html#generation-final-steps)

### Get Key ID

Look at your keyring:

    gpg --list-sigs --fingerprint

Example Output:

    pub   4096R/8A496450 2014-02-27
          Key fingerprint = B998 A96C 4DAA 821A 9C3A  FA5C E28E 332A 8A49 6450
    uid                  Andrew Grieve (CODE SIGNING KEY) <agrieve@apache.org>
    sig 3        8A496450 2014-02-27  Andrew Grieve (CODE SIGNING KEY) <agrieve@apache.org>
    sub   4096R/A59029E7 2014-02-27
    sig          8A496450 2014-02-27  Andrew Grieve (CODE SIGNING KEY) <agrieve@apache.org>

In this example, `8A496450` is your key ID. Set it to a environment variable:

    KEY_ID=8A496450
   
(Or on Windows: `set KEY_ID=8A496450`. Everywhere you see `$KEY_ID` from now on, use `%KEY_ID%` instead)

### Publish Key

Publish to `dist/KEYS`:

    # Clone `cordova-dist` if you don't have it already:
    coho repo-clone -r dist
    
    # Append your key to the KEYS file
    gpg --armor --export $KEY_ID >> cordova-dist/KEYS
    
    # Make sure that's the only change to the file
    ( cd cordova-dist && svn diff )
    
    # Commit
    ( cd cordova-dist && svn commit -m "Added my signing PGP key to KEYS" )
    
See [committer subversion access](https://www.apache.org/dev/version-control.html#https-svn) for information how to access SVN (TLDR: add `--username=...` to the `svn commit` command if needed).

Publish to `keys.gnupg.net`

    gpg --keyserver hkp://keys.gnupg.net --send-keys $KEY_ID

Visit http://pgp.mit.edu/ and paste in result of:

    // Mac
    gpg --armor --export $KEY_ID | pbcopy
    // Windows
    gpg --armor --export $KEY_ID | clip

Copy to your Apache homedir:

    gpg --armor --export $KEY_ID > $KEY_ID.asc
    scp $KEY_ID.asc people.apache.org:

#### Optional

Sign into: https://id.apache.org/ and add your fingerprint (not your KEY_ID). This will cause emails from Apache to you to be encrypted.

## Importing PMC Members' PGP keys

    curl "https://people.apache.org/keys/group/cordova.asc" | gpg --import

Import any extra committer's keys via:

    curl "https://dist.apache.org/repos/dist/release/cordova/KEYS" | gpg --import

## Further reading

* https://www.apache.org/dev/new-committers-guide.html#set-up-security-and-pgp-keys
