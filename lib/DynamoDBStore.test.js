import AWS from 'aws-sdk';
import DynamoDBStore from './DynamoDBStore';

import { DEFAULT_TABLE_NAME } from './constants';

// Store options for testing
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

//
AWS.config.update(TEST_OPTIONS.dynamoParams);
const dynamoService = new AWS.DynamoDB();

beforeAll(async () => {
  // create a test table
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
  // delete the test table
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
        try {
          expect(err).toBeUndefined();
          resolve();
        } catch (error) {
          reject(error);
        }
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
});
