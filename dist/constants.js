'use strict';Object.defineProperty(exports,'__esModule',{value:true});const DEFAULT_TABLE_NAME=exports.DEFAULT_TABLE_NAME='sessions';const DEFAULT_HASH_KEY=exports.DEFAULT_HASH_KEY='sessionId';const DEFAULT_HASH_PREFIX=exports.DEFAULT_HASH_PREFIX='sess:';const DEFAULT_RCU=exports.DEFAULT_RCU=5;const DEFAULT_WCU=exports.DEFAULT_WCU=5;const DEFAULT_TTL=exports.DEFAULT_TTL=86400000;const DEFAULT_TOUCH_INTERVAL=exports.DEFAULT_TOUCH_INTERVAL=30000;const DEFAULT_KEEP_EXPIRED_POLICY=exports.DEFAULT_KEEP_EXPIRED_POLICY=false;const DEFAULT_CALLBACK=exports.DEFAULT_CALLBACK=err=>{if(err){throw err}};const API_VERSION=exports.API_VERSION='2012-08-10';
//# sourceMappingURL=constants.js.map