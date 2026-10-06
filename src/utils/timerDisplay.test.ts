import { describe, it, expect } from 'vitest';
import { isUrgentTime } from './timerDisplay';

describe('isUrgentTime', () => {
  it('returns true for 1 to 10 seconds remaining', () => {
    expect(isUrgentTime(10)).toBe(true);
    expect(isUrgentTime(5)).toBe(true);
    expect(isUrgentTime(1)).toBe(true);
  });

  it('returns false for > 10 seconds remaining', () => {
    expect(isUrgentTime(11)).toBe(false);
    expect(isUrgentTime(30)).toBe(false);
    expect(isUrgentTime(60)).toBe(false);
  });

  it('returns false for 0 or negative seconds', () => {
    expect(isUrgentTime(0)).toBe(false);
    expect(isUrgentTime(-1)).toBe(false);
  });
});
