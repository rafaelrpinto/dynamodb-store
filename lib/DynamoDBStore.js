// @flow

import { Store } from 'express-session';
import AWS from 'aws-sdk'; // eslint-disable-line
import {
  DEFAULT_TABLE_NAME,
  DEFAULT_RCU,
  DEFAULT_WCU,
  DEFAULT_CALLBACK,
  DEFAULT_HASH_KEY,
  DEFAULT_HASH_PREFIX,
  DEFAULT_TTL,
  DEFAULT_TOUCH_INTERVAL,
  DEFAULT_KEEP_EXPIRED_POLICY,
  API_VERSION,
} from './constants';
import { toSecondsEpoch, debug, isExpired } from './util';

/**
 * Express.js session store for DynamoDB.
 */
export default class DynamoDBStore extends Store {
  /**
   * Constructor.
   * @param  {Object} options                Store
   * @param  {Function} callback Optional callback for table creation.
   */
  constructor(options?: Object = {}, callback?: Function = DEFAULT_CALLBACK) {
    super();
    debug('Initializing store', options);

    this.setOptionsAsInstanceAttributes(options);

    const dynamoConfig = options.dynamoConfig || {};

    // dynamodb client configuration
    this.dynamoService = new AWS.DynamoDB({
      ...dynamoConfig,
      apiVersion: API_VERSION,
    });
    this.documentClient = new AWS.DynamoDB.DocumentClient({
      service: this.dynamoService,
    });

    // creates the table if necessary
    this.createTable(callback);
  }

  /**
   * Saves the informed store options as instance attributes.
   * @param {Object} options Store options.
   */
  setOptionsAsInstanceAttributes(options: Object): void {
    const {
      table = {},
      touchInterval = DEFAULT_TOUCH_INTERVAL,
      ttl = DEFAULT_TTL,
      keepExpired = DEFAULT_KEEP_EXPIRED_POLICY,
    } = options;

    const {
      name = DEFAULT_TABLE_NAME,
      hashPrefix = DEFAULT_HASH_PREFIX,
      hashKey = DEFAULT_HASH_KEY,
      readCapacityUnits = DEFAULT_RCU,
      writeCapacityUnits = DEFAULT_WCU,
    } = table;

    this.tableName = name;
    this.hashPrefix = hashPrefix;
    this.hashKey = hashKey;
    this.readCapacityUnits = Number(readCapacityUnits);
    this.writeCapacityUnits = Number(writeCapacityUnits);

    this.touchInterval = touchInterval;
    this.ttl = ttl;
    this.keepExpired = keepExpired;
  }

  /**
   * Creates the session table.
   * @param  {Function} callback Callback to be invoked at the end of the execution.
   */
  async createTable(callback: Function): Promise<void> {
    try {
      // attempt to get details from a table
      await this.dynamoService
        .describeTable({
          TableName: this.tableName,
        })
        .promise();
      debug(`Table ${this.tableName} already exists.`);
      callback();
    } catch (tableNotFoundError) {
      // Table does not exist
      // There is no error code on AWS error that we could match
      // so its safer to assume the error is because the table does not exist than
      // trying to match the message that could change
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
        debug(`Table ${this.tableName} created`, params);
        callback();
      } catch (createTableError) {
        debug(`Error creating table ${this.tableName}`, createTableError);
        callback(createTableError);
      }
    }
  }

  /**
   * Stores a session.
   * @param  {String}   sid      Session ID.
   * @param  {Object}   sess     The session object.
   * @param  {Function} callback Callback to be invoked at the end of the execution.
   */
  async set(sid: string, sess: Object, callback: Function): Promise<void> {
    try {
      const sessionId = this.getSessionId(sid);
      const expires = this.getExpirationDate(sess);
      const params = {
        TableName: this.tableName,
        Item: {
          [this.hashKey]: sessionId,
          expires: toSecondsEpoch(expires),
          sess: {
            ...sess,
            updated: Date.now(),
          },
        },
      };
      debug(`Saving session '${sid}'`, sess);
      this.documentClient.put(params, callback);
    } catch (err) {
      debug('Error saving session', {
        sid,
        sess,
        err,
      });
      callback(err);
    }
  }

  /**
   * Retrieves a session from dynamo.
   * @param  {String}   sid      Session ID.
   * @param  {Function} callback Callback to be invoked at the end of the execution.
   */
  async get(sid: string, callback: Function): Promise<void> {
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

      if (!result || !result.Item) {
        debug(`Session '${sid}' not found`);
        callback(null, null);
      } else if (isExpired(result.Item.expires)) {
        this.handleExpiredSession(sid, callback);
      } else {
        debug(`Session '${sid}' found`, result.Item.sess);
        callback(null, result.Item.sess);
      }
    } catch (err) {
      debug(`Error getting session '${sid}'`, err);
      callback(err);
    }
  }

  /**
   * Deletes a session from dynamo.
   * @param  {String}   sid      Session ID.
   * @param  {Function} callback Callback to be invoked at the end of the execution.
   */
  async destroy(sid: string, callback: Function): Promise<void> {
    try {
      const sessionId = this.getSessionId(sid);
      const params = {
        TableName: this.tableName,
        Key: {
          [this.hashKey]: sessionId,
        },
      };
      await this.documentClient.delete(params).promise();
      debug(`Destroyed session '${sid}'`);
      callback(null, null);
    } catch (err) {
      debug(`Error destroying session '${sid}'`, err);
      callback(err);
    }
  }

  /**
   * Updates the expiration time of an existing session.
   * @param  {String}   sid      Session ID.
   * @param  {Object}   sess     The session object.
   * @param  {Function} callback Callback to be invoked at the end of the execution.
   */
  async touch(sid: string, sess: Object, callback: Function): Promise<void> {
    try {
      if (!sess.updated || Number(sess.updated) + this.touchInterval <= Date.now()) {
        const sessionId = this.getSessionId(sid);
        const expires = this.getExpirationDate(sess);
        const params = {
          TableName: this.tableName,
          Key: {
            [this.hashKey]: sessionId,
          },

          UpdateExpression: 'set expires = :e, sess.#up = :n',
          ExpressionAttributeNames: {
            '#up': 'updated',
          },
          ExpressionAttributeValues: {
            ':e': toSecondsEpoch(expires),
            ':n': Date.now(),
          },
          ReturnValues: 'UPDATED_NEW',
        };
        debug(`Touching session '${sid}'`);
        this.documentClient.update(params, callback);
      } else {
        debug(`Skipping touch of session '${sid}'`);
        callback(null);
      }
    } catch (err) {
      debug(`Error touching session '${sid}'`, err);
      callback(err);
    }
  }

  /**
   * Handles get requests that found expired sessions.
   * @param  {String} sid Original session id.
   * @param  {Function} callback Callback to be invoked at the end of the execution.
   */
  async handleExpiredSession(sid: string, callback: Function): Promise<void> {
    debug(`Found session '${sid}' but it is expired`);
    if (this.keepExpired) {
      callback(null, null);
    } else {
      this.destroy(sid, callback);
    }
  }

  /**
   * Builds the session ID foe storage.
   * @param  {String} sid Original session id.
   * @return {String}     Prefix + original session id.
   */
  getSessionId(sid: string): string {
    return `${this.hashPrefix}${sid}`;
  }

  /**
   * Calculates the session expiration date.
   * @param  {Object} sess The session object.
   * @return {Date}      the session expiration date.
   */
  getExpirationDate(sess: Object): Date {
    let expirationDate = Date.now();
    if (sess.cookie && Number.isInteger(sess.cookie.maxAge)) {
      expirationDate += sess.cookie.maxAge;
    } else {
      expirationDate += this.ttl;
    }
    return new Date(expirationDate);
  }
}
