`use strict`;

const { CreateInvalidationCommand } = require("@aws-sdk/client-cloudfront");
const Logger = require("./logger.js");
const logger = new Logger();

/**
 * A cloudfront utility class to invalidate the cache
 */
class CacheInvalidate {
  /**
   * constructor
   *
   * @param {Object} cloudfront A clodufront object
   */
  constructor(cloudfront) {
    this.cloudfront = cloudfront;
  }

  /**
   * Creates a new invalidation request for specified cloudfront distribution.
   * This request will include the all the path specified, otherwise /* will
   * be passed.
   *
   * @param {String} distributionId A cloudfront distributionId
   * @param {Object} options An options passed through the command line
   */
  async invalidate(distributionId, options) {
    if (!Array.isArray(options.path) || !options.path.length > 0) {
      options.path = ["/*"];
    }
    let params = {
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: "website-deploy-" + Math.floor(Date.now() / 1000),
        Paths: {
          Quantity: options.path.length,
          Items: options.path,
        },
      },
    };
    if (options.debug) {
      logger.debug(
        "Submitting the request with: " + JSON.stringify(params, null, 2),
      );
    }
    const command = new CreateInvalidationCommand(params);
    const response = await this.cloudfront.send(command);
    if (response.Invalidation) {
      logger.info(
        "Invalidation is submitted with id: " + response.Invalidation.Id,
      );
      logger.info(
        "The current status of request is: " + response.Invalidation.Status,
      );
      if (options.debug) {
        logger.debug(
          "The response received: " + JSON.stringify(response, null, 2),
        );
      }
    }
  }
}

module.exports = CacheInvalidate;
