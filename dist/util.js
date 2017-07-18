'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toSecondsEpoch = toSecondsEpoch;
exports.getAwsConfig = getAwsConfig;
/**
 * Transforms a date t seconds epoch.
 * @param  {Date} date The date to be converted.
 * @return {Integer}      Representation of the date in seconds epoch.
 */
function toSecondsEpoch(date) {
  if (!(date instanceof Date)) {
    throw new Error(date + ' is not a Date!');
  }
  return Math.floor(date.getTime() / 1000);
}

/**
 * Checks if an AWS config object is valid.
 * @param  {Object}  config config object to be evaluated.
 * @return {Boolean}       if the AWS config object is valid.
 */
function isValidAwsConfig(config) {
  return config && config.accessKeyId && config.secretAccessKey && config.region;
}

/**
 * Retrieves the AWS parameters from the options or ENV vars.
 * @param  {Object}  options Store options.
 * @return {Object}         Config object.
 */
function getAwsConfig(options) {
  var config = void 0;
  if (options && isValidAwsConfig(options.awsConfig)) {
    // priority to configuration explicitly made
    config = options.awsConfig;
    if (options.dynamoConfig && options.dynamoConfig.endpoint) {
      config.endpoint = options.dynamoConfig.endpoint;
    }
  } else {
    config = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_DEFAULT_REGION
    };
    if (!config.endpoint && process.env.AWS_DYNAMO_ENDPOINT) {
      config.endpoint = process.env.AWS_DYNAMO_ENDPOINT;
    }
  }

  if (isValidAwsConfig(config)) {
    return config;
  }
  throw new Error('Invalid AWS parameters!');
}