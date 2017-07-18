import AWS from 'aws-sdk';
import uuidv4 from 'uuid/v4';
import DynamoDBStore from './DynamoDBStore';
import { toSecondsEpoch } from './util';

import { DEFAULT_TABLE_NAME } from './constants';

const TEST_OPTIONS = {
  table: {
    name: 'test-sessions',
    hashKey: 'test-sessionId',
    hashPrefix: 'test:',
  },
  dynamoParams: {
    region: 'local',
    endpoint: 'http://localhost:8000',
  },
};

AWS.config.update(TEST_OPTIONS.dynamoParams);
const dynamoService = new AWS.DynamoDB();
const documentClient = new AWS.DynamoDB.DocumentClient(null, dynamoService);

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
        dynamoParams: {
          region: 'local',
          endpoint: 'http://localhost:8000',
        },
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
      const options = {
        dynamoParams: {
          region: 'local',
          endpoint: 'http://localhost:8000',
        },
      };
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

  it('should create session', () =>
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
            expect(sessionRow.Item.expires).toBeGreaterThan(toSecondsEpoch(new Date()));
            expect(sessionRow.Item.sess).toBeDefined();
            expect(sessionRow.Item.sess.name).toBe(name);
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      });
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
});
