export const LOW_HAT_THRESHOLD = 5;

export function isHatRunningLow(hatLength: number): boolean {
  return hatLength < LOW_HAT_THRESHOLD;
}
