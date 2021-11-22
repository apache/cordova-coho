# Checklist for relase voting

This is just a short checklist of things to check when voting for a release. Please follow the [release voting guide](./release-voting.md) first.

You can do this with or without coho.

1. Download files from E-mail
1. Verify signature (`coho verify-archive FILENAME`, `gpg --verify FILENAME.asc`)
1. Verify hash (`coho verify-archive FILENAME`)
1. Untar package (`tar -xf FILENAME`)
1. Check version (version from release, no -dev suffix)
1. Check release notes (release notes for current release exist)
1. Check cordova engine (`engines.cordovaDependencies.CURRENTVERSION` in package.json does not have `>100`)
1. Check license file (license file with Apache license exists)
1. Clone/update git repo
1. Check tag with hash from E-mail (`coho verify-tags` in repository in ~/apache directory)
1. Run tests
1. npm audit
1. Check license headers (all source code files need Apache license header, Apache Rat helps, `coho audit-license-headers` in repository in ~/apache directory)
1. Check dependencies (npm dependencies need to be licensed with a compatible license, `coho check-license` in repository in ~/apache directory)