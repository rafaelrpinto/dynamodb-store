import { Store } from 'express-session';
import AWS from 'aws-sdk';
import {
  DEFAULT_TABLE_NAME,
  DEFAULT_RCU,
  DEFAULT_WCU,
  DEFAULT_CALLBACK,
  DEFAULT_HASH_KEY,
  DEFAULT_HASH_PREFIX,
  API_VERSION,
} from './constants';

export default class DynamoDBStore extends Store {
  constructor(options = {}, callback = DEFAULT_CALLBACK) {
    super();
    // table properties
    this.tableName = options.table && options.table.name ? options.table.name : DEFAULT_TABLE_NAME;
    this.prefix =
      options.table && options.table.hashPrefix ? options.table.hashPrefix : DEFAULT_HASH_PREFIX;
    this.hashKey =
      options.table && options.table.hashKey ? options.table.hashKey : DEFAULT_HASH_KEY;
    this.readCapacityUnits =
      options.table && options.table.readCapacityUnits
        ? Number(options.table.readCapacityUnits)
        : DEFAULT_RCU;
    this.writeCapacityUnits =
      options.table && options.table.writeCapacityUnits
        ? Number(options.table.writeCapacityUnits)
        : DEFAULT_WCU;

    // AWS setup options
    const dynamoParams = options.dynamoParams ? options.dynamoParams : {};
    this.dynamoService = new AWS.DynamoDB({
      ...dynamoParams,
      apiVersion: API_VERSION,
    });
    this.documentClient = new AWS.DynamoDB.DocumentClient(null, this.dynamoService);

    // creates the table if necessary
    this.dynamoService
      .describeTable({
        TableName: this.tableName,
      })
      .promise()
      .then(() => callback())
      .catch(() => this.createTable(callback));
  }

  async createTable(callback) {
    try {
      const params = {
        TableName: this.tableName,
        KeySchema: [{ AttributeName: this.hashKey, KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: this.hashKey, AttributeType: 'S' }],
        ProvisionedThroughput: {
          ReadCapacityUnits: this.readCapacityUnits,
          WriteCapacityUnits: this.writeCapacityUnits,
        },
      };
      await this.dynamoService.createTable(params).promise();
      callback();
    } catch (err) {
      callback(err);
    }
  }

  // all(callback) {}

  // clear(callback) {}

  // destroy(sid, callback) {}

  // get(sid, callback) {}

  // length(callback) {}

  // set(sid, sess, callback) {}

  // touch(sid, session, callback) {}
}
