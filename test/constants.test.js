import {
  DEFAULT_TABLE_NAME,
  DEFAULT_RCU,
  DEFAULT_WCU,
  DEFAULT_CALLBACK,
  DEFAULT_HASH_KEY,
  DEFAULT_HASH_PREFIX,
  DEFAULT_TTL,
  DEFAULT_TOUCH_INTERVAL,
  API_VERSION,
} from '../lib/constants';

describe('constants', () => {
  it('should have all the constants', () => {
    expect(API_VERSION).toBeDefined();
    expect(DEFAULT_TOUCH_INTERVAL).toBeDefined();
    expect(DEFAULT_TTL).toBeDefined();
    expect(DEFAULT_HASH_PREFIX).toBeDefined();
    expect(DEFAULT_HASH_KEY).toBeDefined();
    expect(DEFAULT_CALLBACK).toBeDefined();
    expect(DEFAULT_WCU).toBeDefined();
    expect(DEFAULT_RCU).toBeDefined();
    expect(DEFAULT_TABLE_NAME).toBeDefined();
  });

  it('default callback raises the appropriate error', () =>
    expect(() => {
      DEFAULT_CALLBACK('AN ERROR');
    }).toThrow('AN ERROR'));

  it('default callback raises the appropriate error', () => {
    DEFAULT_CALLBACK(null);
  });
});
