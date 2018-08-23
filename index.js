#!/usr/bin/env node

const program = require('commander');
const clear = require('clear');
const chalk = require('chalk');
const figlet = require('figlet');
const package = require('./package.json');
const AWS = require('aws-sdk');
const S3Deploy = require('./libs/s3-deploy.js');
const Logger = require('./libs/logger.js');
const logger = new Logger();

// Lets clear the console
clear();

// banner of the cli
console.info(
  chalk.yellow(figlet.textSync(package.name, {horizontalLayout: 'full'}))
);
console.info(chalk.cyan('Version: ' + package.version));

/**
 * callback to collect the multiple instances of same argument options
 *
 * @param {String} val A value of argument option
 * @param {Array} memo An array
 * @return {Array} An array containing all values of argument option
 */
function collect(val, memo) {
  memo.push(val);
  return memo;
}

// argument parser
program.version(package.version).description(package.description);

// deploy command
program
  .command('deploy <srcDirectory> <bucketName>')
  .description('Deploys the static website directory to s3 bucket with sync')
  .option('--profile <profileName>', 'AWS credential profile name')
  .option('--region <regionName>', 'AWS region name', 'us-east-1')
  .option(
    '--delete [flag]',
    'Files that exist in the destination but not in the source are deleted during sync'
  )
  .option('--debug [flag]', 'Log extra debug information')
  .action(function(srcDirectory, bucketName, options) {
    const message =
      'Deploying from ' + srcDirectory + ' to s3 bucket ' + bucketName;
    logger.info(message);
    AWS.config.update({region: options.region});
    if (options.profile !== undefined) {
      let credentials = new AWS.SharedIniFileCredentials({
        profile: options.profile,
      });
      AWS.config.credentials = credentials;
    }
    let s3 = new AWS.S3({apiVersion: '2006-03-01'});
    let s3deploy = new S3Deploy(s3);
    try {
      s3deploy.syncBucket(srcDirectory, bucketName, options);
    } catch (exception) {
      logger.error(exception);
      process.exit(1);
    }
  });

// invalidate the cloudfront Cache
program
  .command('invalidate <cloudfrontId>')
  .description('Invalidates the cloudfront cache')
  .option(
    '--path [value]',
    'A repeatable value of path that needs the invalidation',
    collect,
    []
  )
  .action(function(cloudfrontId, options) {
    console.log('Cloudfront Id: %j', cloudfrontId);
    console.log('path: %j', options.path);
  });

// parse the command line arguments
program.parse(process.argv);

// dispay the usage
if (!program.args.length) program.help();
