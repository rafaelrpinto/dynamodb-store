# dynamodb-store

![Build Status](https://travis-ci.org/rafaelrpinto/dynamodb-store.svg?branch=master) [![Coverage Status](https://coveralls.io/repos/github/rafaelrpinto/dynamodb-store/badge.svg?branch=master)](https://coveralls.io/github/rafaelrpinto/dynamodb-store?branch=master) [![Code Climate](https://codeclimate.com/github/rafaelrpinto/dynamodb-store.svg)](https://codeclimate.com/github/rafaelrpinto/dynamodb-store) ![Dependencies](https://david-dm.org/rafaelrpinto/dynamodb-store.svg)

Implementation of a session storage using [DynamoDB](https://aws.amazon.com/dynamodb/)
as an extension of the [express-session middleware](https://github.com/expressjs/session).

**The minimum Node.js version required by this module is 6.x**.

The project uses the following stack:

- ES2017
- Babel
- Eslint with AirBnB style
- Jest
- Yarn
- Husky
- Flow

The project was tested with Express.js 4.x.

This store implements the [touch](https://github.com/expressjs/session#storetouchsid-session-callback) method to allow express-session configurations to use [resave](https://github.com/expressjs/session#resave): false.

## Installation

​
`yarn add dynamodb-store`
or
`npm install --save dynamodb-store`

## Serverless Tip

AWS SDK is set as optional dependency, so use the `--no-optional-dependencies`to avoid shipping it (lambda containers already have it).

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

I've built a [boilerplate](https://github.com/rafaelrpinto/aws-lambda-stateful-express-boilerplate) that shows how to use this store.

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
    "endpoint": "<DYNAMO ENDPOINT>"
  },
  "keepExpired": false,
  "touchInterval": 30000,
  "ttl": 600000
}
```

The `table` configuration is optional. The missing properties will be replaced by [defaults](https://github.com/rafaelrpinto/dynamodb-store/blob/master/lib/constants.js). `readCapacityUnits` and `writeCapacityUnits` are only used if the table is created by this store.

The `dynamoConfig` can be optional if the following environment variables are set: **AWS_ACCESS_KEY_ID**, **AWS_SECRET_ACCESS_KEY** and **AWS_REGION** (which are present on Lambda Functions running on AWS). All properties from [AWS.DynamoDB constructor](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property) can be informed in this structure.

The `keepExpired` property is optional (defaults to false). When set to false informs the store to remove from DynamoDB expired session rows when they are requested. When set to true the store will just ignores the expired rows and leave them in DynamoDB. This property does not guarantee that all expired sessions will be removed from DynamoDB, only the ones that receive requests after they expire.

The `touchInterval` property defines how ofter requests should update the time to live of a session. This property is important to avoid unnecessary table writes. By default the interval allows express to touch a same session every 30 seconds. `touchInterval` = 0 will cause a touch on every request.

The `ttl` property is optional (defaults to 1 day) and represents the server-side controlled time to live of the sessions (in ms). See more below.

## TTL

The time to live of the sessions can be controlled:

#### Using cookies with the [cookie.maxAge](https://github.com/expressjs/session#cookiemaxage) property:

If this property is set, the session cookie will be created with a fixed 'expires' attribute. After the specified time the session cookie will expire and a new session will be created even if the user is still active. To avoid that you need update the 'expires' attribute of the session cookie on every request by setting the [rolling](https://github.com/expressjs/session#rolling) session property to **true**. This way every request will have a set-cookie response with the updated 'expires' attribute.

#### Using the TTL property (recommended)

Using the `ttl` property implemented by this store the session time to live will be controlled by the server. The time to live will be refreshed based on the `touchInterval` property without the need to update cookies.

If both `cookie.maxAge` and `ttl` are informed, `ttl` takes precedence.

## Removing expired sessions

To keep the session table clear of expired sessions, you must setup the [Time To Live](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html) feature of DynamoDB pointing to the `expires` field.

Bear in mind that DynamoDB's TTL cleanup can take up to 48 hours. Although the expired sessions will be ignored by the store, they will still be in the table during this period.

If you have intense traffic on your application and the 48h wait period causes unnecessary storage costs, consider creating a scheduled lambda function that scans few records at a time and clears the expired.

If you really want the store to be responsible for that use [this other store](https://github.com/ca98am79/connect-dynamodb) that has a `reap` mechanism to periodically clear the expired sessions manually.

Setting the `keepExpired` property to **false** also helps with the the housekeeping.

## Testing

With a [local DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) running on port **8000** you just need to run:

`yarn run testLocal`

If you want to test with a different DynamoDB configuration, edit the variables on .env:

```bash
AWS_ACCESS_KEY_ID=dummyKey
AWS_SECRET_ACCESS_KEY=dummySecret
AWS_REGION=local
AWS_DYNAMO_ENDPOINT=http://localhost:8000
DYNAMODB_STORE_DEBUG=true
```

If you want to run the tests and see the coverage:

`yarn test`

## Debugging

To enable debug logging of the store, set the environment variable **DYNAMODB_STORE_DEBUG** to **true** and all the store method calls will be shown in the console:

```bash
Wed Jul 19 2017 23:16:04 GMT+0100 (WEST) - DYNAMODB_STORE: Skipping touch of session 'vn31s3sl3k5fHiHs1saMXNEyb_hEp1KS'
Wed Jul 19 2017 23:16:06 GMT+0100 (WEST) - DYNAMODB_STORE: Session 'vn31s3sl3k5fHiHs1saMXNEyb_hEp1KS' found {"csrfSecret":"ZeYyyZyHv1rADky_hmiYt40e","cookie":{"path":"/","expires":null,"_expires":null,"data":{"path":"/","expires":null,"httpOnly":true,"secure":true,"originalMaxAge":null,"sameSite":true},"maxAge":null,"sameSite":true,"httpOnly":true,"secure":true,"originalMaxAge":null},"updated":1500502536135,"user":{"firstName":"Shaylee","lastName":"Robel","avatar":"https://s3.amazonaws.com/uifaces/faces/twitter/yassiryahya/128.jpg"}}
Wed Jul 19 2017 23:16:06 GMT+0100 (WEST) - DYNAMODB_STORE: Touching session 'vn31s3sl3k5fHiHs1saMXNEyb_hEp1KS'
```

## References

This project used [connect-dynamodb](https://github.com/ca98am79/connect-dynamodb) and [cassandra-store](https://github.com/webcc/cassandra-store) as reference for implementation/documentation.
