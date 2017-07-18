import { toSecondsEpoch, getAwsConfig } from '../lib/util';

describe('util', () => {
  it('should calculate the seconds epoch for a date', () => {
    const date = new Date('2017-07-18T00:00:00.000Z');
    const asSeconds = toSecondsEpoch(date);
    expect(asSeconds).toBe(1500336000);
  });

  it('should raise an error for non-date argument', () => {
    expect(() => {
      toSecondsEpoch({});
    }).toThrow();
  });

  it('should create a configuration with the informed parameters', () => {
    const options = {
      awsConfig: {
        accessKeyId: 'A1',
        secretAccessKey: 'A2',
        region: 'R1',
      },
      dynamoConfig: {
        endpoint: 'E1',
      },
    };
    const config = getAwsConfig(options);
    expect(config).toBeDefined();
    expect(config.accessKeyId).toBe(options.awsConfig.accessKeyId);
    expect(config.secretAccessKey).toBe(options.awsConfig.secretAccessKey);
    expect(config.region).toBe(options.awsConfig.region);
    expect(config.endpoint).toBe(options.dynamoConfig.endpoint);
  });

  it('should create a configuration using env vars', () => {
    const config = getAwsConfig({});
    expect(config).toBeDefined();
    expect(config.accessKeyId).toBe(process.env.AWS_ACCESS_KEY_ID);
    expect(config.secretAccessKey).toBe(process.env.AWS_SECRET_ACCESS_KEY);
    expect(config.region).toBe(process.env.AWS_DEFAULT_REGION);
    expect(config.endpoint).toBe(process.env.AWS_DYNAMO_ENDPOINT);
  });
});
