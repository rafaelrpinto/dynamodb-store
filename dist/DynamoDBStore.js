'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _isInteger = require('babel-runtime/core-js/number/is-integer');

var _isInteger2 = _interopRequireDefault(_isInteger);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _expressSession = require('express-session');

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _constants = require('./constants');

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Express.js session store fro DynamoDB.
 */
var DynamoDBStore = function (_Store) {
  (0, _inherits3.default)(DynamoDBStore, _Store);

  /**
   * Constructor.
   * @param  {Object} options                Store options.
   * @param  {Function} callback Optional callback for table creation.
   */
  function DynamoDBStore() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _constants.DEFAULT_CALLBACK;
    (0, _classCallCheck3.default)(this, DynamoDBStore);

    var _this = (0, _possibleConstructorReturn3.default)(this, (DynamoDBStore.__proto__ || (0, _getPrototypeOf2.default)(DynamoDBStore)).call(this));

    (0, _util.debug)('Initializing store', options);
    // table properties
    _this.tableName = options.table && options.table.name ? options.table.name : _constants.DEFAULT_TABLE_NAME;
    _this.hashPrefix = options.table && options.table.hashPrefix ? options.table.hashPrefix : _constants.DEFAULT_HASH_PREFIX;
    _this.hashKey = options.table && options.table.hashKey ? options.table.hashKey : _constants.DEFAULT_HASH_KEY;
    _this.readCapacityUnits = options.table && options.table.readCapacityUnits ? Number(options.table.readCapacityUnits) : _constants.DEFAULT_RCU;
    _this.writeCapacityUnits = options.table && options.table.writeCapacityUnits ? Number(options.table.writeCapacityUnits) : _constants.DEFAULT_WCU;
    _this.touchInterval = options.touchInterval >= 0 ? options.touchInterval : _constants.DEFAULT_TOUCH_INTERVAL;
    // time to live
    _this.ttl = options.ttl ? options.ttl : _constants.DEFAULT_TTL;

    // Retrieves basic credentials/endpoint configs from the options
    var dynamoConfig = options.dynamoConfig ? options.dynamoConfig : {};
    dynamoConfig = (0, _extends3.default)({}, dynamoConfig, {
      apiVersion: _constants.API_VERSION
    });
    _this.dynamoService = new _awsSdk2.default.DynamoDB(dynamoConfig);
    _this.documentClient = new _awsSdk2.default.DynamoDB.DocumentClient({
      service: _this.dynamoService
    });

    // creates the table if necessary
    _this.dynamoService.describeTable({
      TableName: _this.tableName
    }).promise().then(function () {
      (0, _util.debug)('Table ' + _this.tableName + ' already exists.', options);
      callback();
    }).catch(function () {
      return _this.createTable(callback);
    });
    return _this;
  }

  /**
   * Creates the session table.
   * @param  {Function} callback Callback to be invoked at the wnd of the execution.
   */


  (0, _createClass3.default)(DynamoDBStore, [{
    key: 'createTable',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(callback) {
        var params;
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.prev = 0;
                params = {
                  TableName: this.tableName,
                  KeySchema: [{ AttributeName: this.hashKey, KeyType: 'HASH' }],
                  AttributeDefinitions: [{ AttributeName: this.hashKey, AttributeType: 'S' }],
                  ProvisionedThroughput: {
                    ReadCapacityUnits: this.readCapacityUnits,
                    WriteCapacityUnits: this.writeCapacityUnits
                  }
                };
                _context.next = 4;
                return this.dynamoService.createTable(params).promise();

              case 4:
                (0, _util.debug)('Table ' + this.tableName + ' created', params);
                callback();
                _context.next = 12;
                break;

              case 8:
                _context.prev = 8;
                _context.t0 = _context['catch'](0);

                (0, _util.debug)('Error creating table ' + this.tableName, _context.t0);
                callback(_context.t0);

              case 12:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[0, 8]]);
      }));

      function createTable(_x3) {
        return _ref.apply(this, arguments);
      }

      return createTable;
    }()

    /**
     * Stores a session.
     * @param  {String}   sid      Session ID.
     * @param  {Object}   sess     The session object.
     * @param  {Function} callback Callback to be invoked at the wnd of the execution.
     */

  }, {
    key: 'set',
    value: function () {
      var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(sid, sess, callback) {
        var _Item, sessionId, expires, params;

        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                try {
                  sessionId = this.getSessionId(sid);
                  expires = this.getExpirationDate(sess);
                  params = {
                    TableName: this.tableName,
                    Item: (_Item = {}, (0, _defineProperty3.default)(_Item, this.hashKey, sessionId), (0, _defineProperty3.default)(_Item, 'expires', (0, _util.toSecondsEpoch)(expires)), (0, _defineProperty3.default)(_Item, 'sess', (0, _extends3.default)({}, sess, {
                      updated: Date.now()
                    })), _Item)
                  };

                  (0, _util.debug)('Saving session \'' + sid + '\'', sess);
                  this.documentClient.put(params, callback);
                } catch (err) {
                  (0, _util.debug)('Error saving session', {
                    sid: sid,
                    sess: sess,
                    err: err
                  });
                  callback(err);
                }

              case 1:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function set(_x4, _x5, _x6) {
        return _ref2.apply(this, arguments);
      }

      return set;
    }()

    /**
     * Retrieves a session from dynamo.
     * @param  {String}   sid      Session ID.
     * @param  {Function} callback Callback to be invoked at the wnd of the execution.
     */

  }, {
    key: 'get',
    value: function () {
      var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(sid, callback) {
        var sessionId, params, result;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.prev = 0;
                sessionId = this.getSessionId(sid);
                params = {
                  TableName: this.tableName,
                  Key: (0, _defineProperty3.default)({}, this.hashKey, sessionId),
                  ConsistentRead: true
                };
                _context3.next = 5;
                return this.documentClient.get(params).promise();

              case 5:
                result = _context3.sent;

                if (result && result.Item && result.Item.expires && result.Item.expires > (0, _util.toSecondsEpoch)(new Date())) {
                  (0, _util.debug)('Session \'' + sid + '\' found', result.Item.sess);
                  callback(null, result.Item.sess);
                } else {
                  (0, _util.debug)('Session \'' + sid + '\' not found');
                  callback(null, null);
                }
                _context3.next = 13;
                break;

              case 9:
                _context3.prev = 9;
                _context3.t0 = _context3['catch'](0);

                (0, _util.debug)('Error getting session \'' + sid + '\'', _context3.t0);
                callback(_context3.t0);

              case 13:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this, [[0, 9]]);
      }));

      function get(_x7, _x8) {
        return _ref3.apply(this, arguments);
      }

      return get;
    }()

    /**
     * Deletes a session from dynamo.
     * @param  {String}   sid      Session ID.
     * @param  {Function} callback Callback to be invoked at the wnd of the execution.
     */

  }, {
    key: 'destroy',
    value: function () {
      var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(sid, callback) {
        var sessionId, params;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.prev = 0;
                sessionId = this.getSessionId(sid);
                params = {
                  TableName: this.tableName,
                  Key: (0, _defineProperty3.default)({}, this.hashKey, sessionId)
                };
                _context4.next = 5;
                return this.documentClient.delete(params).promise();

              case 5:
                (0, _util.debug)('Destroyed session \'' + sid + '\'');
                callback(null);
                _context4.next = 13;
                break;

              case 9:
                _context4.prev = 9;
                _context4.t0 = _context4['catch'](0);

                (0, _util.debug)('Error destroying session \'' + sid + '\'', _context4.t0);
                callback(_context4.t0);

              case 13:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this, [[0, 9]]);
      }));

      function destroy(_x9, _x10) {
        return _ref4.apply(this, arguments);
      }

      return destroy;
    }()

    /**
     * Updates the expiration time of an existing session.
     * @param  {String}   sid      Session ID.
     * @param  {Object}   sess     The session object.
     * @param  {Function} callback Callback to be invoked at the wnd of the execution.
     */

  }, {
    key: 'touch',
    value: function () {
      var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(sid, sess, callback) {
        var sessionId, expires, params;
        return _regenerator2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                try {
                  if (!sess.updated || Number(sess.updated) + this.touchInterval <= Date.now()) {
                    sessionId = this.getSessionId(sid);
                    expires = this.getExpirationDate(sess);
                    params = {
                      TableName: this.tableName,
                      Key: (0, _defineProperty3.default)({}, this.hashKey, sessionId),
                      UpdateExpression: 'set expires = :e, sess.#up = :n',
                      ExpressionAttributeNames: {
                        '#up': 'updated'
                      },
                      ExpressionAttributeValues: {
                        ':e': (0, _util.toSecondsEpoch)(expires),
                        ':n': Date.now()
                      },
                      ReturnValues: 'UPDATED_NEW'
                    };

                    (0, _util.debug)('Touching session \'' + sid + '\'');
                    this.documentClient.update(params, callback);
                  } else {
                    (0, _util.debug)('Skipping touch of session \'' + sid + '\'');
                    callback(null);
                  }
                } catch (err) {
                  (0, _util.debug)('Error touching session \'' + sid + '\'', err);
                  callback(err);
                }

              case 1:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function touch(_x11, _x12, _x13) {
        return _ref5.apply(this, arguments);
      }

      return touch;
    }()

    /**
     * Builds the session ID foe storage.
     * @param  {String} sid Original session id.
     * @return {String}     Prefix + original session id.
     */

  }, {
    key: 'getSessionId',
    value: function getSessionId(sid) {
      return '' + this.hashPrefix + sid;
    }

    /**
     * Calculates the session expiration date.
     * @param  {Object} sess The session object.
     * @return {Date}      the session expiration date.
     */

  }, {
    key: 'getExpirationDate',
    value: function getExpirationDate(sess) {
      var expirationDate = (0, _moment2.default)();
      if (sess.cookie && (0, _isInteger2.default)(sess.cookie.maxAge)) {
        expirationDate = expirationDate.add(sess.cookie.maxAge, 'ms');
      } else {
        expirationDate = expirationDate.add(this.ttl, 'ms');
      }
      return expirationDate.toDate();
    }
  }]);
  return DynamoDBStore;
}(_expressSession.Store);

exports.default = DynamoDBStore;