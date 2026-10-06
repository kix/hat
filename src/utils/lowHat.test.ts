import { describe, it, expect } from 'vitest';
import { isHatRunningLow, LOW_HAT_THRESHOLD } from './lowHat';

describe('lowHat', () => {
  it('has a threshold of 5 words', () => {
    expect(LOW_HAT_THRESHOLD).toBe(5);
  });

  it('returns true when hat count is strictly less than 5', () => {
    expect(isHatRunningLow(4)).toBe(true);
    expect(isHatRunningLow(1)).toBe(true);
    expect(isHatRunningLow(0)).toBe(true);
  });

  it('returns false when hat count is 5 or greater', () => {
    expect(isHatRunningLow(5)).toBe(false);
    expect(isHatRunningLow(10)).toBe(false);
  });
});
