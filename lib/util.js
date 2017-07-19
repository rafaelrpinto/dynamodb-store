/**
 * Transforms a date t seconds epoch.
 * @param  {Date} date The date to be converted.
 * @return {Integer}      Representation of the date in seconds epoch.
 */
export function toSecondsEpoch(date) {
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
export function debug(message, object) {
  if (process.env.DYNAMODB_STORE_DEBUG) {
    const argument = object !== null && object !== undefined ? object : '';
    //eslint-disable-next-line
    console.log(
      `${new Date()} - DYNAMODB_STORE: ${message}`,
      typeof argument === 'object' ? JSON.stringify(argument) : argument,
    );
  }
}
