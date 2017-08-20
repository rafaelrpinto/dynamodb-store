import { Store } from 'express-session';
import AWS from 'aws-sdk';
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
import { toSecondsEpoch, debug } from './util';

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
    debug('Initializing store', options);

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
    this.touchInterval =
      options.touchInterval >= 0 ? options.touchInterval : DEFAULT_TOUCH_INTERVAL;

    // time to live
    this.ttl = options.ttl ? options.ttl : DEFAULT_TTL;

    // housekeeping
    this.keepExpired = options.keepExpired ? options.keepExpired : DEFAULT_KEEP_EXPIRED_POLICY;

    // dynamodb client configuration
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
      .then(() => {
        debug(`Table ${this.tableName} already exists.`, options);
        callback();
      })
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
      debug(`Table ${this.tableName} created`, params);
      callback();
    } catch (err) {
      debug(`Error creating table ${this.tableName}`, err);
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

      if (!result || !result.Item) {
        debug(`Session '${sid}' not found`);
        callback(null, null);
      } else if (!result.Item.expires || result.Item.expires <= toSecondsEpoch(new Date())) {
        debug(`Found session '${sid}' but it is expired`);
        if (this.keepExpired) {
          callback(null, null);
        } else {
          this.destroy(sid, callback);
        }
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
   * @param  {Function} callback Callback to be invoked at the wnd of the execution.
   */
  async touch(sid, sess, callback) {
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
    let expirationDate = Date.now();
    if (sess.cookie && Number.isInteger(sess.cookie.maxAge)) {
      expirationDate += sess.cookie.maxAge;
    } else {
      expirationDate += this.ttl;
    }
    return new Date(expirationDate);
  }
}
