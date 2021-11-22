# Checklist for relase voting

Here is a short checklist when voting for a release. Please follow the [release voting guide](./release-voting.md) first.

First we need the information in the VOTE E-mail and dowload all files.

**With coho:**

1. Verify signature (`coho verify-archive FILENAME`, `gpg --verify FILENAME.asc`)
1. Verify hash (`coho verify-archive FILENAME`)

**Without coho:**

1. Untar the package (`tar -xf FILENAME`)
  1. Check version (version from release, no -dev suffix)
  1. Check release notes (release notes for current release exist)
  1. Check license file (license file with Apache license exists)

## With the git repo upstream

Before continuing, we must first fetch and pull the latest changes from the repo that is being voted on and then switch to the release draft tag.

**With coho:**

1. Check tag with hash from E-mail (`coho verify-tags` in repository in ~/apache directory)
1. Check license headers (all source code files need Apache license header, Apache Rat helps, `coho audit-license-headers` in repository in ~/apache directory)
1. Check dependencies (npm dependencies need to be licensed with a compatible license, `coho check-license` in repository in ~/apache directory)

**Without coho:**

1. Run tests
1. npm audit

*Special Case for Plugins:*

1. Check cordova engine (`engines.cordovaDependencies.CURRENTVERSION` in package.json does not have `>100`)