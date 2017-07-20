dynamodb-store
===============
![Build Status](https://travis-ci.org/rafaelrpinto/dynamodb-store.svg?branch=master) [![Coverage Status](https://coveralls.io/repos/github/rafaelrpinto/dynamodb-store/badge.svg?branch=master)](https://coveralls.io/github/rafaelrpinto/dynamodb-store?branch=master) ![Dependencies](https://david-dm.org/rafaelrpinto/dynamodb-store.svg) ![NPM Downloads](https://img.shields.io/npm/dt/dynamodb-store.svg) ![NPM version](https://img.shields.io/npm/v/dynamodb-store.svg) [![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.png?v=103)](https://github.com/ellerbrock/open-source-badges/) ![rich](https://img.shields.io/badge/Become%20a%20millionaire-failing-red.svg)


Implementation of a session storage using [DynamoDB](https://aws.amazon.com/dynamodb/)
as an extension of the [express-session middleware](https://github.com/expressjs/session).

The project uses the following stack:

- ES2017
- Babel
- Moment.js
- Eslint with AirBnB style
- Jest
- Yarn

The project was tested with Node.js 6 and Express.js 4.x.

This store implements the [touch](https://github.com/expressjs/session#touch) method to allow express-session configurations to use [resave](https://github.com/expressjs/session#resave): false.

## Installation
​
`yarn add dynamodb-store`
or
`npm install --save dynamodb-store`


## Usage

Usage within express:

```javascript
const session = require("express-session");
const DynamoDBStore = require('dynamodb-store');

app.use(session({
    store: new DynamoDBStore(options),
    ...
}));
```
I've built a [boilerplate that uses this store](https://github.com/rafaelrpinto/aws-lambda-stateful-express-boilerplate).

## Options

```json
{
  "table": {
    "name": "<NAME OF THE DYNAMO TABLE>",
    "hashKey": "<NAME OF THE ID FIELD>",
    "hashPrefix": "<PREFIX FOR THE SESSION ID VALUES>",
    "readCapacityUnits": 10,
    "writeCapacityUnits": 10
  },
  "dynamoConfig": {
    "accessKeyId": "<AWS ACCESS KEY>",
    "secretAccessKey": "<AWS ACCESS KEY SECRET>",
    "region": "<AWS REGION>",
    "endpoint": "<DYNAMO ENDPOINT>",
  },
  "touchInterval": 30000,
  "ttl": 600000,
}
```

The `table` configuration is optional. The missing properties will be replaced by [defaults](https://github.com/rafaelrpinto/dynamodb-store/blob/master/lib/constants.js). `readCapacityUnits` and `writeCapacityUnits` are only used if the table is created by this store.

The `dynamoConfig` can be optional if the following environment variables are set: **AWS_ACCESS_KEY_ID**, **AWS_SECRET_ACCESS_KEY** and **AWS_REGION**. Any other property from the [AWS.DynamoDB constructor](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property) can be informed in this structure.

The `touchInterval` property defines how ofter requests should update the time to live of a session. This property is important to avoid unnecessary table writes. By default the interval allows one touch every 30 seconds. `touchInterval` = 0 will cause a touch on every request.

The `ttl` property is optional and represents the server-side controlled time to live of the sessions (in ms). See more below.

## TTL

The time to live of the sessions can be controlled:

#### Using cookies with the [cookie.maxAge](https://github.com/expressjs/session#cookiemaxage) property:

If this property is set, the session cookie will have a fixed time to live and the cookie can only be updated if the [rolling](https://github.com/expressjs/session#rolling) session property is set to **true**.

#### Using the TTL property

The `ttl` property implemented by this store defines a session time to live controlled by the server that is refreshed based on the `touchInterval` property without the need to update the session cookie.

## Removing expired sessions

To keep the table clear of expired sessions you must setup the [Time To Live](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html) feature of DynamoDB pointingto the `expires` field.

Bear in mind that DynamoDB's TTL cleanup can take up to 48 hours. Although the expired records will be ignored by the store, they will still be in the table during this period.

If you have intense traffic on your application and the 48h wait period causes unnecessary storage costs, consider creating a scheduled lambda function that scans few records a a time and clears the expired.

If you really want the store to be responsible for that use [this other store](https://github.com/ca98am79/connect-dynamodb) that has a `reap` mechanism to periodically clear the expired entries.

## Testing

With a [local DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) running on port **8000** you just need to run:

`yarn test`

If you want to test with a different DynamoDB configuration, edit the variables on package.json:

```json
{
  "test": {
    "command": "jest",
    "env": {
      "AWS_ACCESS_KEY_ID": "dummyKey",
      "AWS_SECRET_ACCESS_KEY": "dummySecret",
      "AWS_REGION": "eu-west-2",
      "AWS_DYNAMO_ENDPOINT":"http://localhost:8000"
    }
  }
}
```

## Debugging

To enable debug logging of the store, set the environment variable **DYNAMODB_STORE_DEBUG** to **true** and all the store method calls show in the console:

```bash
Wed Jul 19 2017 23:16:04 GMT+0100 (WEST) - DYNAMODB_STORE: Skipping touch of session 'vn31s3sl3k5fHiHs1saMXNEyb_hEp1KS'
Wed Jul 19 2017 23:16:06 GMT+0100 (WEST) - DYNAMODB_STORE: Session 'vn31s3sl3k5fHiHs1saMXNEyb_hEp1KS' found {"csrfSecret":"ZeYyyZyHv1rADky_hmiYt40e","cookie":{"path":"/","expires":null,"_expires":null,"data":{"path":"/","expires":null,"httpOnly":true,"secure":true,"originalMaxAge":null,"sameSite":true},"maxAge":null,"sameSite":true,"httpOnly":true,"secure":true,"originalMaxAge":null},"updated":1500502536135,"user":{"firstName":"Shaylee","lastName":"Robel","avatar":"https://s3.amazonaws.com/uifaces/faces/twitter/yassiryahya/128.jpg"}}
Wed Jul 19 2017 23:16:06 GMT+0100 (WEST) - DYNAMODB_STORE: Touching session 'vn31s3sl3k5fHiHs1saMXNEyb_hEp1KS'
```

## References

This project used [connect-dynamodb](https://github.com/ca98am79/connect-dynamodb) and [cassandra-store](https://github.com/webcc/cassandra-store) as reference for implementation/documentation.
