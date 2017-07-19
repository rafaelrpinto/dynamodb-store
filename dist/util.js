'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

exports.toSecondsEpoch = toSecondsEpoch;
exports.debug = debug;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * Logs messages when debug is enabled.
 * @param  {String} message Message to be debugged.
 * @param  {Object} object  Optional param that will be strigified.
 */
function debug(message, object) {
  if (process.env.DYNAMODB_STORE_DEBUG) {
    var argument = object !== null && object !== undefined ? object : '';
    //eslint-disable-next-line
    console.log(new Date() + ' - DYNAMODB_STORE: ' + message, (typeof argument === 'undefined' ? 'undefined' : (0, _typeof3.default)(argument)) === 'object' ? (0, _stringify2.default)(argument) : argument);
  }
}