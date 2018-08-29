'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Logger = require('./logger.js');
const logger = new Logger();

/**
 * A s3 utility class
 */
class S3Deploy {
  /**
   * s3 utility constructor
   *
   * @param {S3} s3 The elasticsearch client object
   */
  constructor(s3) {
    this.s3 = s3;
  }

  /**
   * s3 sync utility
   *
   * @param {String} directory The directory whose content needs to be synced with bucket
   * @param {String} bucketName Name of s3 bucket to which content is synced
   * @param {Object} options An options passed through the command line
   */
  async syncBucket(directory, bucketName, options) {
    let that = this;
    let directoryPath = path.normalize(directory);
    if (!path.isAbsolute(directoryPath)) {
      directoryPath = path.join(process.cwd(), directoryPath);
    }
    if (fs.existsSync(directoryPath)) {
      // read the directory
      let files = await readDirectory(directoryPath, []);
      if (options.debug) {
        logger.debug(
          'Files from the directory: ' + JSON.stringify(files, null, 2)
        );
      }
      // copy the files to s3
      await Promise.all(
        files.map(async (name) => {
          let params = {
            Bucket: bucketName,
            Key: name.substring(directoryPath.length + 1),
          };
          // lets check if object need to be updated
          let needCopy = await that.exists(params, name);
          // add a stream to params object
          params.Body = fs.createReadStream(name);
          if (options.debug) {
            logger.debug('Should the file ' + name + ' synced? => ' + needCopy);
          }
          // copy the object if necessary
          if (needCopy) {
            await that.copy(params);
          }
          return name;
        })
      );

      if (options.delete) {
        if (options.debug) {
          logger.debug('Delete option specified.');
        }
        const allKeys = [];
        await this.ls({Bucket: bucketName}, allKeys);
        if (options.debug) {
          logger.debug(
            'All keys in bucket: ' + JSON.stringify(allKeys, null, 2)
          );
        }
        // Check the files exists in source
        await Promise.all(
          allKeys.map(async (key) => {
            let filepath = path.join(directoryPath, key);
            if (options.debug) {
              logger.debug(
                'Trying to check the object' + filepath + ' in source.'
              );
            }
            if (!fs.existsSync(filepath)) {
              if (options.debug) {
                logger.debug('File ' + filepath + ' does not exits in source.');
              }
              // delete from the bucket
              let params = {
                Bucket: bucketName,
                Key: key,
              };
              try {
                let data = await this.s3.deleteObject(params).promise();
                if (options.debug) {
                  logger.debug(
                    'Delete response:' + JSON.stringify(data, null, 2)
                  );
                }

                // DeleteMarker property will be in case of versioning of objects
                if (
                  Object.getOwnPropertyNames(data).length == 0 ||
                  data.DeleteMarker
                ) {
                  logger.info(
                    'Object ' + key + ' has been deleted successfully.'
                  );
                }
              } catch (exception) {
                logger.error(exception);
              }
            }
          })
        );
      }
    } else {
      throw new Error('The source directory ' + directoryPath + ' not found.');
    }
  }

  /**
   * Check the object exists in bucket with same Content
   *
   * We will use MD5 digest to verify the contents are exactly same in s3
   * object and source file in filesystem.
   *
   * @param {Object} params An Object with s3 param options for s3 call
   * @param {String} file A local source absolute filepath
   */
  async exists(params, file) {
    try {
      let data = await this.s3.getObject(params).promise();
      if (
        crypto
          .createHash('md5')
          .update(fs.readFileSync(file, 'utf8'))
          .digest('hex') ===
        crypto
          .createHash('md5')
          .update(data.Body.toString('utf-8'))
          .digest('hex')
      ) {
        logger.info(
          'File ' + params.Key + ' is unchanged, thus not copying it.'
        );
        return Promise.resolve(false);
      }
    } catch (exception) {
      logger.error(exception);
    }
    return Promise.resolve(true);
  }

  /**
   * Copy the object to bucket
   *
   * @param {Object} params An Object with s3 param options for s3 call
   */
  async copy(params) {
    try {
      let data = await this.s3.putObject(params).promise();
      if (data.ETag) {
        logger.info('File ' + params.Key + ' has been copied successfully.');
      }
    } catch (exception) {
      logger.error(exception);
      return Promise.reject();
    }
    return Promise.resolve();
  }

  /**
   * List the bucket with all keys
   *
   * @param {Object} params An Object with s3 param options for s3 call
   * @param {Array}  keys An array with all keys
   */
  async ls(params, keys) {
    const response = await this.s3.listObjectsV2(params).promise();
    response.Contents.forEach((obj) => keys.push(obj.Key));

    if (response.IsTruncated) {
      const newParams = Object.assign({}, params);
      newParams.ContinuationToken = response.NextContinuationToken;
      await ls(newParams, keys); // RECURSIVE CALL
    }
  }
}

/**
 * Read the local source directory
 *
 * This will walk the directory recursively and append files to `files` array
 *
 * @param {String} directoryPath A directory path to be read
 * @param {Array} files An array to hold the files from the directory
 * @return {Array} files An array of files from the directory specified
 */
function readDirectory(directoryPath, files) {
  fs.readdirSync(directoryPath).forEach(function(name) {
    let filePath = path.join(directoryPath, name);
    let stat = fs.statSync(filePath);
    if (stat.isFile()) {
      files.push(filePath);
    } else if (stat.isDirectory()) {
      readDirectory(filePath, files);
    }
  });
  return files;
}

module.exports = S3Deploy;
