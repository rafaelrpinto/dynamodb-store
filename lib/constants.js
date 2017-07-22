// defaults
export const DEFAULT_TABLE_NAME = 'sessions';
export const DEFAULT_HASH_KEY = 'sessionId';
export const DEFAULT_HASH_PREFIX = 'sess:';
export const DEFAULT_RCU = 5;
export const DEFAULT_WCU = 5;
export const DEFAULT_TTL = 86400000;
export const DEFAULT_TOUCH_INTERVAL = 30000;
export const DEFAULT_KEEP_EXPIRED_POLICY = false;
export const DEFAULT_CALLBACK = (err) => {
  if (err) {
    throw err;
  }
};

// aws
export const API_VERSION = '2012-08-10';
