"use strict";

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Logger = require("./logger.js");
const os = require("os");

const logger = new Logger();
const platform = os.platform();

/**
 * A lambda deployment utility class
 */
class LambdaDeploy {
  /**
   * lambda utility constructor
   *
   * @param {Lambda} lambda The lambda client object
   * @param {S3} s3 The s3 client object
   */
  constructor(lambda, s3) {
    this.lambda = lambda;
    this.s3 = s3;
  }

  /**
   * lambda function code update utility
   *
   * @param {String} functionName The name of function
   * @param {String} zipFilePath file path with name to be deployed
   * @param {Object} options An options passed through the command line
   */
  async update(functionName, zipFilePath, options) {
    if (fs.existsSync(zipFilePath)) {
      // get the current function code sha256
      const currentFunctionCodeSha256 =
        await this.getLatestCodeSha256(functionName);
      if (options.debug) {
        logger.debug(
          "Existing function code SHA256 is: " + currentFunctionCodeSha256,
        );
      }
      // calculate the hash of the new zip file
      const sha256LocalFile = await getSHA256(zipFilePath);
      if (options.debug) {
        logger.debug("New function code SHA256 is: " + sha256LocalFile);
      }
      if (currentFunctionCodeSha256 !== sha256LocalFile) {
        // function code is not same, lets deploy a new version
        if (options.debug) {
          logger.debug("The SHA256 of a new file is: " + sha256LocalFile);
        }
        const zipData = fs.readFileSync(zipFilePath);
        const params = {
          FunctionName: functionName,
          Publish: true,
        };
        if (options.bucket) {
          if (options.debug) {
            logger.debug("Uploading the file to s3 bucket: " + options.bucket);
          }
          // upload the it via s3 bucket
          try {
            const copyResponse = await copy(
              this.s3,
              options.bucket,
              options.prefix,
              zipFilePath,
            );
            params.S3Bucket = copyResponse.Bucket;
            params.S3Key = copyResponse.Key;
          } catch (exception) {
            logger.error("Exception: " + exception);
            throw new Error(
              "Could not copy the file s3 bucket: " + options.bucket,
            );
          }
        } else {
          params.ZipFile = zipData;
        }
        try {
          const response = await this.lambda
            .updateFunctionCode(params)
            .promise();
          if (response) {
            logger.info(
              "Updated lambda " +
                functionName +
                " version " +
                response.Version +
                "(" +
                response.CodeSize +
                " bytes) at " +
                response.LastModified,
            );
            if (options.debug) {
              logger.debug(
                "The sha256 of a new deployed code is: " + response.CodeSha256,
              );
            }
          }
        } catch (exception) {
          logger.error("Exception: " + exception);
        }
      } else {
        logger.info("Nothing to deploy, function is already updated!");
      }
    } else {
      throw new Error("The file " + zipFilePath + " not found.");
    }
  }

  /**
   * Get last code SHA256 of lambda function
   *
   * @param {String} functionName The name of function
   * @return {String} A promise with resolve to properties of function
   */
  async getLatestCodeSha256(functionName) {
    const params = {
      FunctionName: functionName,
    };
    try {
      const response = await this.lambda.getFunction(params).promise();
      if (response) {
        return Promise.resolve(response.Configuration.CodeSha256);
      }
    } catch (exception) {
      logger.error(exception);
    }
    return Promise.reject(new Error("Could not generate the SHA code"));
  }

  /**
   * Recursively fetch all the version of lambda function
   *
   * Reference: https://gist.github.com/olivoil/7e42d1e7941c24a7872d8c0ecf296be8/
   *
   * @param {String} functionName The name of function
   * @param {String} marker A tag for getting next version list from last call
   * @param {Array} versions An array to store the versions
   * @return {Array} An array of versions
   */
  async listVersions(functionName, marker, versions) {
    const prev = versions || [];
    const params = { FunctionName: functionName, MaxItems: 10000 };
    if (marker) {
      params.Marker = marker;
    }
    let list = { Versions: [], NextMarker: "" };
    try {
      list = await this.lambda.listVersionsByFunction(params).promise();
    } catch (e) {
      console.log(`error fetching versions for ${name}: ${e.message}`);
    }
    const curr = prev.concat(list.Versions);
    if (list.NextMarker) {
      return listVersions(name, list.NextMarker, curr);
    }
    return curr;
  }

  /**
   * Get the versions of the lambda function
   *
   * Reference: https://gist.github.com/olivoil/7e42d1e7941c24a7872d8c0ecf296be8/
   *
   * @param {String} functionName The name of function
   * @param {Object} options An options passed through the command line
   * @return {Array} An array of versions
   */
  async versions(functionName, options) {
    const keepLast = options.count || 5;
    const versions = await this.listVersions(functionName);

    const sorted = versions.sort((v1, v2) => {
      if (v1.LastModified < v2.LastModified) {
        return 1;
      } else if (v1.LastModified > v2.LastModified) {
        return -1;
      } else {
        return 0;
      }
    });
    if (sorted.length > keepLast) {
      return sorted.slice(0, keepLast);
    }
    return sorted;
  }
}

/**
 * copy the file to s3 bucket
 *
 * @param {S3} s3 s3 client object
 * @param {String} bucket bucket name
 * @param {String} prefix the prefix to be used for uploaded file
 * @param {String} filePath file to upload
 * @return {Object} s3 copy reuest object
 */
async function copy(s3, bucket, prefix, filePath) {
  if (platform === "win32") {
    // if win32, then replace any / with \
    filePath = filePath.replace(/\//g, "\\");
  }
  filePath = path.normalize(filePath);
  if (!path.isAbsolute(filePath)) {
    filePath = path.join(process.cwd(), filePath);
  }
  logger.debug("The file path is: " + filePath);
  const separator = platform === "win32" ? "\\" : "/";
  const objectKey = filePath.substring(filePath.lastIndexOf(separator) + 1);

  const params = {
    Bucket: bucket,
    Key: prefix ? prefix + "/" + objectKey : objectKey,
  };
  params.Body = fs.createReadStream(filePath);
  try {
    const data = await s3.putObject(params).promise();
    if (data.ETag) {
      logger.info("File " + params.Key + " has been copied successfully.");
    }
  } catch (exception) {
    logger.error(exception);
    throw new Error("Could not copy the file to s3 bucket.");
  }
  return params;
}

/**
 * Get the sha256 of a deployable file in base64
 *
 * @param {String} fileName The a deployable file
 * @return {Promise} A promise with resolve to sha256 in base64 for the provided file
 */
function getSHA256(fileName) {
  const readStream = fs.createReadStream(fileName);
  const hash = crypto.createHash("sha256");
  hash.setEncoding("hex");
  readStream.on("data", function (chunk) {
    hash.update(chunk);
  });
  return new Promise(function (resolve, reject) {
    readStream.on("end", () => resolve(hash.digest("base64")));
    readStream.on("error", reject);
  });
}

module.exports = LambdaDeploy;
