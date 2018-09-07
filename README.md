# website-deploy

A simple utility to deploy a static website to [s3-bucket, ...]

[![CircleCI](https://circleci.com/gh/RishikeshDarandale/website-deploy.svg?style=svg)](https://circleci.com/gh/RishikeshDarandale/website-deploy)
[![Known Vulnerabilities](https://snyk.io/test/github/RishikeshDarandale/website-deploy/badge.svg)](https://snyk.io/test/github/RishikeshDarandale/website-deploy)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/b5521af6e43f477a85b40d146177dc32)](https://www.codacy.com/app/RishikeshDarandale/website-deploy?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=RishikeshDarandale/website-deploy&amp;utm_campaign=Badge_Grade)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=RishikeshDarandale/website-deploy)](https://dependabot.com)
[![npm](https://img.shields.io/npm/v/website-deploy.svg)](https://www.npmjs.com/package/website-deploy)
[![npm](https://img.shields.io/npm/dt/website-deploy.svg)](https://www.npmjs.com/package/website-deploy)
[![NpmLicense](https://img.shields.io/npm/l/website-deploy.svg)](https://github.com/RishikeshDarandale/website-deploy/blob/master/LICENSE)

# Pre-requisite

**You need a node v8 or higher to run this utility.**

# Installation

## Install globally

```console
npm install --global website-deploy
```

## Install in project

```console
npm install --save-dev website-deploy
```

# Usage

This utility has following sub-commands:

## deploy

This sub-command sync the provided source folder with AWS s3 bucket.

```console
website-deploy s3 [options] <SOURCE_DIR> <S3_BUCKET_NAME>
```

### Options

`--delete [true|false]`

This will delete all the files from the AWS s3 bucket which are not present in provided <SOURCE_DIR>

`--debug [true|false]`

This will print extra debug statements for more visibility

`--profile <profile name>`

Provide a AWS credential profile as a credentials.

`--region <AWS region>`

Provide a AWS region Name

## invalidate-cache

This sub-command will invalidate the cloudfront cache

```console
website-deploy invalidate-cache [options] <CLOUDFRONT_DISTRIBUTION_ID>
```

### Options

`--path <PATH>`

A object path to be invalidated. This can be provided multiple times to specify additional paths.

e.g.

```console
website-deploy invalidate-cache <CLOUDFRONT_DISTRIBUTION_ID> --path "/index.html" --path "/error.html"
```

`--debug [true|false]`

This will print extra debug statements for more visibility

`--profile <profile name>`

Provide a AWS credential profile as a credentials.

`--region <AWS region>`

Provide a AWS region Name

# Issue or need a new feature?

If you are experiencing a issue or wanted to add a new feature, please create a github issue [here][1].

# Contributing

:heart: contribution: Here is [contributing guide] in deatil.

For impatient here are quick steps:

- **Fork** the repository
- Create **Branch** in you local repository
- while(youFinish) { **Commit** }
- **Squash** related commits.
- **Write** unit test cases for your work.
- Check the **Build** on your local.
- Raise a **Pull Request** (aka PR)


[1]: https://github.com/RishikeshDarandale/website-deploy/issues/new
