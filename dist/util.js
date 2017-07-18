"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toSecondsEpoch = toSecondsEpoch;
function toSecondsEpoch(date) {
  return Math.floor(date.getTime() / 1000);
}