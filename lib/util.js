// @flow

/**
 * Transforms a date t seconds epoch.
 * @param  {Date} date The date to be converted.
 * @return {Integer}      Representation of the date in seconds epoch.
 */
export function toSecondsEpoch(date: Date): number {
  if (!(date instanceof Date)) {
    throw new Error(`${date} is not a Date!`);
  }
  return Math.floor(date.getTime() / 1000);
}

/**
 * Logs messages when debug is enabled.
 * @param  {String} message Message to be debugged.
 * @param  {Object} object  Optional param that will be strigified.
 */
export function debug(message: string, object: ?Object): void {
  if (process.env.DYNAMODB_STORE_DEBUG) {
    const argument = object || '';

    console.log(
      `${new Date().toString()} - DYNAMODB_STORE: ${message}`,
      typeof argument === 'object' ? JSON.stringify(argument) : argument,
    );
  }
}

/**
 * Checks if an expiration date has passed.
 * @param {number} expiresOn Optiona expiration date on second epoch.
 */
export function isExpired(expiresOn: ?number): boolean {
  return !expiresOn || expiresOn <= toSecondsEpoch(new Date());
}
