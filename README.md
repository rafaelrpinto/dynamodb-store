dynamodb-store
===============
![Build Status](https://travis-ci.org/rafaelrpinto/dynamodb-store.svg?branch=master)

Implementation of a session storage using [DynamoDB](https://aws.amazon.com/dynamodb/)
as an extension of the [express-session middleware](https://github.com/expressjs/session).

The project uses the following stack:

- ES2017
- Babel
- Moment.js
- Eslint with AirBnB style
- Jest
- Yarn

The store was tested with Node.js 6 and Express.js 4.x.

## Options

```json
{
  "table": {
    "name": "<NAME OF THE DYNAMO TABLE>",
    "hashKey": "<NAME OD THE ID FIELD>",
    "hashPrefix": "<PREFIX FOR THE SESSION ID VALUES>",
  },
  "awsConfig": {
    "accessKeyId": "<AWS ACCESS KEY>",
    "secretAccessKey": "<AWS ACCESS KEY SECRET>",
    "region": "<AWS REGION>",
  },
  "dynamoConfig": {
    "endpoint": "<DYNAMO ENDPOINT>",
  },
}
```

The `table` configuration is optional. If not or partially informed defaults will be used.

The `awsConfig` can be optional if the following environment variables are set: **AWS_ACCESS_KEY_ID**, **AWS_SECRET_ACCESS_KEY** and **AWS_DEFAULT_REGION**. Any other property from the [AWS.Config constructor](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property) can be informed in this structure.

The `dynamoConfig` is optional and the `endpoint` property may also be informed via the environment variable **AWS_DYNAMO_ENDPOINT**. Any other property from the [AWS.DynamoDB constructor](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property) can be informed in this structure.

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

## Installation

TODO

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
      "AWS_DEFAULT_REGION": "eu-west-2",
      "AWS_DYNAMO_ENDPOINT":"http://localhost:8000"
    }
  }
}
```

## References

This project used [connect-dynamodb](https://github.com/ca98am79/connect-dynamodb) and [cassandra-store](https://github.com/webcc/cassandra-store) as reference for implementation/documentation.
