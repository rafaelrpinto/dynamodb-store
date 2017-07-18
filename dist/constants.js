'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
// defaults
var DEFAULT_TABLE_NAME = exports.DEFAULT_TABLE_NAME = 'sessions';
var DEFAULT_HASH_KEY = exports.DEFAULT_HASH_KEY = 'sessionId';
var DEFAULT_HASH_PREFIX = exports.DEFAULT_HASH_PREFIX = 'sess:';
var DEFAULT_RCU = exports.DEFAULT_RCU = 5;
var DEFAULT_WCU = exports.DEFAULT_WCU = 5;
var DEFAULT_TTL = exports.DEFAULT_TTL = 86400000;
var DEFAULT_CALLBACK = exports.DEFAULT_CALLBACK = function DEFAULT_CALLBACK(err) {
  if (err) {
    throw err;
  }
};

// aws
var API_VERSION = exports.API_VERSION = '2012-08-10';