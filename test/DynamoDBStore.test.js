import AWS from 'aws-sdk';
import uuidv4 from 'uuid/v4';
import DynamoDBStore from '../lib/DynamoDBStore';
import { toSecondsEpoch } from '../lib/util';
import { DEFAULT_TABLE_NAME, DEFAULT_TTL } from '../lib/constants';

const TEST_OPTIONS = {
  table: {
    name: 'test-sessions',
    hashKey: 'test-sessionId',
    hashPrefix: 'test:',
  },
  dynamoConfig: {
    endpoint: process.env.AWS_DYNAMO_ENDPOINT,
    maxRetries: 0,
    httpOptions: {
      connectTimeout: 1000,
    },
  },
  touchInterval: 0,
};

const dynamoService = new AWS.DynamoDB(TEST_OPTIONS.dynamoConfig);
const documentClient = new AWS.DynamoDB.DocumentClient({
  service: dynamoService,
});

beforeAll(async () => {
  const params = {
    TableName: TEST_OPTIONS.table.name,
    KeySchema: [{ AttributeName: TEST_OPTIONS.table.hashKey, KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: TEST_OPTIONS.table.hashKey, AttributeType: 'S' }],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  };
  return dynamoService.createTable(params).promise();
});

afterAll(async () => {
  const params = {
    TableName: TEST_OPTIONS.table.name,
  };
  return dynamoService.deleteTable(params).promise();
});

describe('DynamoDBStore', () => {
  it('should create a store and a new table', () =>
    new Promise((resolve, reject) => {
      const options = {
        table: {
          name: 'test-sessions-new',
          hashKey: 'test-sessionId',
          hashPrefix: 'test:',
        },
        dynamoConfig: TEST_OPTIONS.dynamoConfig,
      };
      const store = new DynamoDBStore(options, (err) => {
        try {
          expect(err).toBeUndefined();
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          const params = {
            TableName: options.table.name,
          };
          dynamoService.deleteTable(params).promise();
        }
      });
      expect(store).toBeDefined();
    }));

  it('should create a store using an existing table', () =>
    new Promise((resolve, reject) => {
      const store = new DynamoDBStore(TEST_OPTIONS, (err) => {
        if (err) reject(err);
        else resolve();
      });
      expect(store).toBeDefined();
    }));

  it('should create a store with default table values', () =>
    new Promise((resolve, reject) => {
      const options = { dynamoConfig: TEST_OPTIONS.dynamoConfig };
      const store = new DynamoDBStore(options, (err) => {
        try {
          expect(err).toBeUndefined();
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          const params = {
            TableName: DEFAULT_TABLE_NAME,
          };
          dynamoService.deleteTable(params).promise();
        }
      });
      expect(store).toBeDefined();
    }));

  it('should create session with default ttl', () =>
    new Promise((resolve, reject) => {
      const store = new DynamoDBStore(TEST_OPTIONS, (err) => {
        if (err) reject(err);
      });
      const sessionId = uuidv4();
      const name = uuidv4();
      store.set(sessionId, { name }, async (err) => {
        try {
          if (err) reject(err);
          else {
            const params = {
              TableName: TEST_OPTIONS.table.name,
              Key: {
                [TEST_OPTIONS.table.hashKey]: `${TEST_OPTIONS.table.hashPrefix}${sessionId}`,
              },
            };
            const sessionRow = await documentClient.get(params).promise();
            expect(sessionRow).toBeDefined();
            expect(sessionRow.Item).toBeDefined();
            expect(sessionRow.Item.expires).toBeDefined();
            expect(Number.isInteger(sessionRow.Item.expires)).toBeTruthy();
            // make sure it's in the seconds epoch
            expect(String(sessionRow.Item.expires).length).toBe(
              String(toSecondsEpoch(new Date())).length,
            );
            // future date
            expect(sessionRow.Item.expires).toBeGreaterThan(toSecondsEpoch(new Date()));
            // should be before the default ttl limit
            expect(sessionRow.Item.expires).toBeLessThanOrEqual(
              toSecondsEpoch(new Date(Date.now() + DEFAULT_TTL)),
            );
            // after 10 seconds before the limit (assuming test execution time < 5 seconds)
            expect(sessionRow.Item.expires).toBeGreaterThan(
              // eslint-disable-next-line
              toSecondsEpoch(new Date(Date.now() + DEFAULT_TTL - 10000)),
            );
            expect(sessionRow.Item.sess).toBeDefined();
            expect(sessionRow.Item.sess.name).toBe(name);
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      });
    }));

  it('should create session using the cookie maxAge', () =>
    new Promise((resolve, reject) => {
      const store = new DynamoDBStore(TEST_OPTIONS, (err) => {
        if (err) reject(err);
      });
      const sessionId = uuidv4();
      const maxAge = 100000;
      store.set(
        sessionId,
        {
          cookie: {
            maxAge,
          },
        },
        async (err) => {
          try {
            if (err) reject(err);
            else {
              const params = {
                TableName: TEST_OPTIONS.table.name,
                Key: {
                  [TEST_OPTIONS.table.hashKey]: `${TEST_OPTIONS.table.hashPrefix}${sessionId}`,
                },
              };
              const sessionRow = await documentClient.get(params).promise();
              expect(sessionRow).toBeDefined();
              expect(sessionRow.Item).toBeDefined();
              expect(sessionRow.Item.expires).toBeDefined();
              expect(Number.isInteger(sessionRow.Item.expires)).toBeTruthy();
              // make sure it's in the seconds epoch
              expect(String(sessionRow.Item.expires).length).toBe(
                String(toSecondsEpoch(new Date())).length,
              );
              // future date
              expect(sessionRow.Item.expires).toBeGreaterThan(toSecondsEpoch(new Date()));
              // should be before the default maxAge limit
              expect(sessionRow.Item.expires).toBeLessThanOrEqual(
                toSecondsEpoch(new Date(Date.now() + maxAge)),
              );
              // after 10 seconds before the limit (assuming test execution time < 5 seconds)
              expect(sessionRow.Item.expires).toBeGreaterThan(
                // eslint-disable-next-line
                toSecondsEpoch(new Date(Date.now() + maxAge - 10000)),
              );
              expect(sessionRow.Item.sess).toBeDefined();
              expect(sessionRow.Item.sess.cookie).toBeDefined();
              expect(sessionRow.Item.sess.cookie.maxAge).toBe(maxAge);
              resolve();
            }
          } catch (error) {
            reject(error);
          }
        },
      );
    }));

  it('should update a session', () =>
    new Promise((resolve, reject) => {
      const store = new DynamoDBStore(TEST_OPTIONS, (err) => {
        if (err) reject(err);
      });
      const sessionId = 'abcde';
      const name = uuidv4();
      store.set(sessionId, { name: uuidv4() }, async (err) => {
        if (err) reject(err);
        store.set(sessionId, { name }, async (err2) => {
          try {
            if (err2) reject(err2);
            else {
              const params = {
                TableName: TEST_OPTIONS.table.name,
                Key: {
                  [TEST_OPTIONS.table.hashKey]: `${TEST_OPTIONS.table.hashPrefix}${sessionId}`,
                },
              };
              const sessionRow = await documentClient.get(params).promise();
              expect(sessionRow.Item.sess.name).toBe(name);
              resolve();
            }
          } catch (error) {
            reject(error);
          }
        });
      });
    }));

  it('should get an existing session', () =>
    new Promise((resolve, reject) => {
      const store = new DynamoDBStore(TEST_OPTIONS, (err) => {
        if (err) reject(err);
      });
      const sessionId = uuidv4();
      const name = uuidv4();
      store.set(sessionId, { name }, async (err) => {
        if (err) reject(err);
        else {
          store.get(sessionId, (err2, sess) => {
            try {
              if (err2) reject(err2);
              else {
                expect(sess).toBeDefined();
                expect(sess.name).toBe(name);
                resolve();
              }
            } catch (error) {
              reject(error);
            }
          });
        }
      });
    }));

  it('should receive null for missing sessions', () =>
    new Promise((resolve, reject) => {
      const store = new DynamoDBStore(TEST_OPTIONS, (err) => {
        if (err) reject(err);
      });
      store.get(uuidv4(), (err, sess) => {
        try {
          if (err) reject(err);
          else {
            expect(sess).toBe(null);
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      });
    }));

  it('should return null for expired sessions and keep the record', () =>
    new Promise((resolve, reject) => {
      const store = new DynamoDBStore(
        {
          ...TEST_OPTIONS,
          keepExpired: true,
        },
        (err) => {
          if (err) reject(err);
        },
      );
      const sessionId = uuidv4();
      store.set(
        sessionId,
        {
          cookie: {
            maxAge: -1,
          },
        },
        async (err) => {
          if (err) reject(err);
          else {
            store.get(sessionId, async (err2, sess) => {
              try {
                if (err2) reject(err2);
                else {
                  expect(sess).toBe(null);
                  const params = {
                    TableName: TEST_OPTIONS.table.name,
                    Key: {
                      [TEST_OPTIONS.table.hashKey]: `${TEST_OPTIONS.table.hashPrefix}${sessionId}`,
                    },
                  };
                  const sessionRow = await documentClient.get(params).promise();
                  expect(sessionRow).toBeDefined();
                  expect(sessionRow.Item).toBeDefined();
                  resolve();
                }
              } catch (error) {
                reject(error);
              }
            });
          }
        },
      );
    }));

  it('should return null for expired sessions and destroy the record', () =>
    new Promise((resolve, reject) => {
      const store = new DynamoDBStore(TEST_OPTIONS, (err) => {
        if (err) reject(err);
      });
      const sessionId = uuidv4();
      store.set(
        sessionId,
        {
          cookie: {
            maxAge: -1,
          },
        },
        async (err) => {
          if (err) reject(err);
          else {
            store.get(sessionId, async (err2, sess) => {
              try {
                if (err2) reject(err2);
                else {
                  expect(sess).toBe(null);
                  const params = {
                    TableName: TEST_OPTIONS.table.name,
                    Key: {
                      [TEST_OPTIONS.table.hashKey]: `${TEST_OPTIONS.table.hashPrefix}${sessionId}`,
                    },
                  };
                  const sessionRow = await documentClient.get(params).promise();
                  expect(sessionRow).toBeDefined();
                  expect(sessionRow.Item).toBeUndefined();
                  resolve();
                }
              } catch (error) {
                reject(error);
              }
            });
          }
        },
      );
    }));

  it('should destroy a session', () =>
    new Promise((resolve, reject) => {
      const store = new DynamoDBStore(TEST_OPTIONS, (err) => {
        if (err) reject(err);
      });
      const sessionId = uuidv4();
      const name = uuidv4();
      store.set(sessionId, { name }, async (err) => {
        if (err) reject(err);
        else {
          store.destroy(sessionId, (err2) => {
            if (err2) reject(err2);
            else {
              store.get(sessionId, (err3, sess) => {
                try {
                  if (err3) reject(err3);
                  else {
                    expect(sess).toBe(null);
                    resolve();
                  }
                } catch (error) {
                  reject(error);
                }
              });
            }
          });
        }
      });
    }));

  it('should touch an existing session', () =>
    new Promise((resolve, reject) => {
      const store = new DynamoDBStore(TEST_OPTIONS, (err) => {
        if (err) reject(err);
      });
      const sessionId = uuidv4();
      let originalExpires;
      store.set(sessionId, {}, async (err) => {
        if (err) reject(err);
        else {
          try {
            let params = {
              TableName: TEST_OPTIONS.table.name,
              Key: {
                [TEST_OPTIONS.table.hashKey]: `${TEST_OPTIONS.table.hashPrefix}${sessionId}`,
              },
            };
            let sessionRow = await documentClient.get(params).promise();
            originalExpires = sessionRow.Item.expires;
            setTimeout(() => {
              store.touch(sessionId, sessionRow.Item.sess, async (err3) => {
                if (err3) reject(err3);
                else {
                  try {
                    params = {
                      TableName: TEST_OPTIONS.table.name,
                      Key: {
                        [TEST_OPTIONS.table.hashKey]: `${TEST_OPTIONS.table
                          .hashPrefix}${sessionId}`,
                      },
                    };
                    sessionRow = await documentClient.get(params).promise();
                    expect(sessionRow.Item.expires).toBeGreaterThan(originalExpires);
                    // 5 seconds window for test execution
                    expect(sessionRow.Item.expires).toBeLessThan(originalExpires + 5);
                    resolve();
                  } catch (err4) {
                    reject(err4);
                  }
                }
              });
            }, 2000);
          } catch (err2) {
            reject(err2);
          }
        }
      });
    }));

  it('should not touch an existing session before the interval', () =>
    new Promise((resolve, reject) => {
      const options = {
        ...TEST_OPTIONS,
        touchInterval: 30000,
      };
      const store = new DynamoDBStore(options, (err) => {
        if (err) reject(err);
      });
      const sessionId = uuidv4();
      let originalExpires;
      store.set(sessionId, {}, async (err) => {
        if (err) reject(err);
        else {
          try {
            let params = {
              TableName: TEST_OPTIONS.table.name,
              Key: {
                [TEST_OPTIONS.table.hashKey]: `${TEST_OPTIONS.table.hashPrefix}${sessionId}`,
              },
            };
            let sessionRow = await documentClient.get(params).promise();
            originalExpires = sessionRow.Item.expires;
            setTimeout(() => {
              store.touch(sessionId, sessionRow.Item.sess, async (err3) => {
                if (err3) reject(err3);
                else {
                  try {
                    params = {
                      TableName: TEST_OPTIONS.table.name,
                      Key: {
                        [TEST_OPTIONS.table.hashKey]: `${TEST_OPTIONS.table
                          .hashPrefix}${sessionId}`,
                      },
                    };
                    sessionRow = await documentClient.get(params).promise();
                    expect(sessionRow.Item.expires).toBe(originalExpires);
                    resolve();
                  } catch (err4) {
                    reject(err4);
                  }
                }
              });
            }, 2000);
          } catch (err2) {
            reject(err2);
          }
        }
      });
    }));
});
