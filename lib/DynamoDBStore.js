import { Store } from 'express-session';
import AWS from 'aws-sdk';
import moment from 'moment';
import {
  DEFAULT_TABLE_NAME,
  DEFAULT_RCU,
  DEFAULT_WCU,
  DEFAULT_CALLBACK,
  DEFAULT_HASH_KEY,
  DEFAULT_HASH_PREFIX,
  DEFAULT_TTL,
  API_VERSION,
} from './constants';
import { toSecondsEpoch } from './util';

/**
 * Express.js session store fro DynamoDB.
 */
export default class DynamoDBStore extends Store {
  /**
   * Constructor.
   * @param  {Object} options                Store options.
   * @param  {Function} callback Optional callback for table creation.
   */
  constructor(options = {}, callback = DEFAULT_CALLBACK) {
    super();
    // table properties
    this.tableName = options.table && options.table.name ? options.table.name : DEFAULT_TABLE_NAME;
    this.hashPrefix =
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

    // time to live
    this.ttl = options.ttl ? options.ttl : DEFAULT_TTL;

    // Retrieves basic credentials/endpoint configs from the options
    let dynamoConfig = options.dynamoConfig ? options.dynamoConfig : {};
    dynamoConfig = {
      ...dynamoConfig,
      apiVersion: API_VERSION,
    };
    this.dynamoService = new AWS.DynamoDB(dynamoConfig);
    this.documentClient = new AWS.DynamoDB.DocumentClient({
      service: this.dynamoService,
    });

    // creates the table if necessary
    this.dynamoService
      .describeTable({
        TableName: this.tableName,
      })
      .promise()
      .then(() => callback())
      .catch(() => this.createTable(callback));
  }

  /**
   * Creates the session table.
   * @param  {Function} callback Callback to be invoked at the wnd of the execution.
   */
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

  /**
   * Stores a session.
   * @param  {String}   sid      Session ID.
   * @param  {Object}   sess     The session object.
   * @param  {Function} callback Callback to be invoked at the wnd of the execution.
   */
  async set(sid, sess, callback) {
    try {
      const sessionId = this.getSessionId(sid);
      const expires = this.getExpirationDate(sess);
      const params = {
        TableName: this.tableName,
        Item: {
          [this.hashKey]: sessionId,
          expires: toSecondsEpoch(expires),
          sess,
        },
      };
      this.documentClient.put(params, callback);
    } catch (err) {
      callback(err);
    }
  }

  /**
   * Retrieves a session from dynamo.
   * @param  {String}   sid      Session ID.
   * @param  {Function} callback Callback to be invoked at the wnd of the execution.
   */
  async get(sid, callback) {
    try {
      const sessionId = this.getSessionId(sid);
      const params = {
        TableName: this.tableName,
        Key: {
          [this.hashKey]: sessionId,
        },
        ConsistentRead: true,
      };
      const result = await this.documentClient.get(params).promise();
      if (
        result &&
        result.Item &&
        result.Item.expires &&
        result.Item.expires > toSecondsEpoch(new Date())
      ) {
        callback(null, result.Item.sess);
      } else {
        callback(null, null);
      }
    } catch (err) {
      callback(err);
    }
  }

  /**
   * Deletes a session from dynamo.
   * @param  {String}   sid      Session ID.
   * @param  {Function} callback Callback to be invoked at the wnd of the execution.
   */
  async destroy(sid, callback) {
    try {
      const sessionId = this.getSessionId(sid);
      const params = {
        TableName: this.tableName,
        Key: {
          [this.hashKey]: sessionId,
        },
      };
      await this.documentClient.delete(params).promise();
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  /**
   * Updates the expiration time of an existing session.
   * @param  {String}   sid      Session ID.
   * @param  {Object}   sess     The session object.
   * @param  {Function} callback Callback to be invoked at the wnd of the execution.
   */
  async touch(sid, sess, callback) {
    try {
      const sessionId = this.getSessionId(sid);
      const expires = this.getExpirationDate(sess);
      const params = {
        TableName: this.tableName,
        Key: {
          [this.hashKey]: sessionId,
        },
        UpdateExpression: 'set expires = :e',
        ExpressionAttributeValues: {
          ':e': toSecondsEpoch(expires),
        },
        ReturnValues: 'UPDATED_NEW',
      };
      this.documentClient.update(params, callback);
    } catch (err) {
      callback(err);
    }
  }

  /**
   * Builds the session ID foe storage.
   * @param  {String} sid Original session id.
   * @return {String}     Prefix + original session id.
   */
  getSessionId(sid) {
    return `${this.hashPrefix}${sid}`;
  }

  /**
   * Calculates the session expiration date.
   * @param  {Object} sess The session object.
   * @return {Date}      the session expiration date.
   */
  getExpirationDate(sess) {
    let expirationDate = moment();
    if (sess.cookie && Number.isInteger(sess.cookie.maxAge)) {
      expirationDate = expirationDate.add(sess.cookie.maxAge, 'ms');
    } else {
      expirationDate = expirationDate.add(this.ttl, 'ms');
    }
    return expirationDate.toDate();
  }
}
