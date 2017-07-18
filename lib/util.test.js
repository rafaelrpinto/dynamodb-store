import { toSecondsEpoch } from './util';

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
});
