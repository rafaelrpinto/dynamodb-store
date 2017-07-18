'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _expressSession = require('express-session');

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _constants = require('./constants');

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Express.js session store fro DynamoDB.
 */
var DynamoDBStore = function (_Store) {
  _inherits(DynamoDBStore, _Store);

  /**
   * Constructor.
   * @param  {Object} options                Store options.
   * @param  {Function} callback Optional callback for table creation.
   */
  function DynamoDBStore() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _constants.DEFAULT_CALLBACK;

    _classCallCheck(this, DynamoDBStore);

    // table properties
    var _this = _possibleConstructorReturn(this, (DynamoDBStore.__proto__ || Object.getPrototypeOf(DynamoDBStore)).call(this));

    _this.tableName = options.table && options.table.name ? options.table.name : _constants.DEFAULT_TABLE_NAME;
    _this.hashPrefix = options.table && options.table.hashPrefix ? options.table.hashPrefix : _constants.DEFAULT_HASH_PREFIX;
    _this.hashKey = options.table && options.table.hashKey ? options.table.hashKey : _constants.DEFAULT_HASH_KEY;
    _this.readCapacityUnits = options.table && options.table.readCapacityUnits ? Number(options.table.readCapacityUnits) : _constants.DEFAULT_RCU;
    _this.writeCapacityUnits = options.table && options.table.writeCapacityUnits ? Number(options.table.writeCapacityUnits) : _constants.DEFAULT_WCU;

    // time to live
    _this.ttl = options.ttl ? options.ttl : _constants.DEFAULT_TTL;

    // Retrieves basic credentials/endpoint configs from the options
    var awsConfig = (0, _util.getAwsConfig)(options);
    _awsSdk2.default.config.update(awsConfig);
    // merges all the options for dynamo client
    var dynamoConfig = options.dynamoConfig ? options.dynamoConfig : {};
    dynamoConfig = _extends({}, dynamoConfig, awsConfig, {
      apiVersion: _constants.API_VERSION
    });
    _this.dynamoService = new _awsSdk2.default.DynamoDB(dynamoConfig);
    _this.documentClient = new _awsSdk2.default.DynamoDB.DocumentClient(null, _this.dynamoService);

    // creates the table if necessary
    _this.dynamoService.describeTable({
      TableName: _this.tableName
    }).promise().then(function () {
      return callback();
    }).catch(function () {
      return _this.createTable(callback);
    });
    return _this;
  }

  /**
   * Creates the session table.
   * @param  {Function} callback Callback to be invoked at the wnd of the execution.
   */


  _createClass(DynamoDBStore, [{
    key: 'createTable',
    value: function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(callback) {
        var params;
        return regeneratorRuntime.wrap(function _callee$(_context) {
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
                callback();
                _context.next = 10;
                break;

              case 7:
                _context.prev = 7;
                _context.t0 = _context['catch'](0);

                callback(_context.t0);

              case 10:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[0, 7]]);
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
      var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(sid, sess, callback) {
        var _Item, sessionId, expires, params;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                try {
                  sessionId = this.getSessionId(sid);
                  expires = this.getExpirationDate(sess);
                  params = {
                    TableName: this.tableName,
                    Item: (_Item = {}, _defineProperty(_Item, this.hashKey, sessionId), _defineProperty(_Item, 'expires', (0, _util.toSecondsEpoch)(expires)), _defineProperty(_Item, 'sess', sess), _Item)
                  };

                  this.documentClient.put(params, callback);
                } catch (err) {
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
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(sid, callback) {
        var sessionId, params, result;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.prev = 0;
                sessionId = this.getSessionId(sid);
                params = {
                  TableName: this.tableName,
                  Key: _defineProperty({}, this.hashKey, sessionId),
                  ConsistentRead: true
                };
                _context3.next = 5;
                return this.documentClient.get(params).promise();

              case 5:
                result = _context3.sent;

                if (result && result.Item && result.Item.expires && result.Item.expires > (0, _util.toSecondsEpoch)(new Date())) {
                  callback(null, result.Item.sess);
                } else {
                  callback(null, null);
                }
                _context3.next = 12;
                break;

              case 9:
                _context3.prev = 9;
                _context3.t0 = _context3['catch'](0);

                callback(_context3.t0);

              case 12:
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
      var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(sid, callback) {
        var sessionId, params;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.prev = 0;
                sessionId = this.getSessionId(sid);
                params = {
                  TableName: this.tableName,
                  Key: _defineProperty({}, this.hashKey, sessionId)
                };
                _context4.next = 5;
                return this.documentClient.delete(params).promise();

              case 5:
                callback(null);
                _context4.next = 11;
                break;

              case 8:
                _context4.prev = 8;
                _context4.t0 = _context4['catch'](0);

                callback(_context4.t0);

              case 11:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this, [[0, 8]]);
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
      var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(sid, sess, callback) {
        var sessionId, expires, params;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                try {
                  sessionId = this.getSessionId(sid);
                  expires = this.getExpirationDate(sess);
                  params = {
                    TableName: this.tableName,
                    Key: _defineProperty({}, this.hashKey, sessionId),
                    UpdateExpression: 'set expires = :e',
                    ExpressionAttributeValues: {
                      ':e': (0, _util.toSecondsEpoch)(expires)
                    },
                    ReturnValues: 'UPDATED_NEW'
                  };

                  this.documentClient.update(params, callback);
                } catch (err) {
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
      if (sess.cookie && Number.isInteger(sess.cookie.maxAge)) {
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