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

# Creating a PGP key for Releases

On a Mac:

    brew install gpg

How to create a key: http://www.apache.org/dev/openpgp.html#generate-key
 * email = you@apache.org
 * description = CODE SIGNING KEY

Look at your keyring:

    gpg --list-sigs --fingerprint

Example Output:

    pub   4096R/8A496450 2014-02-27
          Key fingerprint = B998 A96C 4DAA 821A 9C3A  FA5C E28E 332A 8A49 6450
    uid                  Andrew Grieve (CODE SIGNING KEY) <agrieve@apache.org>
    sig 3        8A496450 2014-02-27  Andrew Grieve (CODE SIGNING KEY) <agrieve@apache.org>
    sub   4096R/A59029E7 2014-02-27
    sig          8A496450 2014-02-27  Andrew Grieve (CODE SIGNING KEY) <agrieve@apache.org>

In this example, `8A496450` is your `$KEY_ID`


Publish to `dist/KEYS`:

    # Clone if you don't have it already:
    coho repo-clone -r dist
    gpg --armor --export $KEY_ID >> cordova-dist/KEYS
    # Make sure that's the only change to the file
    ( cd cordova-dist && svn diff )
    # Commit
    ( cd cordova-dist && svn commit -m "Added my signing PGP key to KEYS" )


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

Optional:
Sign into: https://id.apache.org/ and add your fingerprint (not your KEY_ID)
  * This will cause emails from Apache to you to be encrypted.

Phew! That was easy :P


# Importing PMC Members' PGP keys

    curl "https://people.apache.org/keys/group/cordova.asc" | gpg --import

Import any extra committer's keys via:

    curl "https://dist.apache.org/repos/dist/release/cordova/KEYS" | gpg --import

