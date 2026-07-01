// Same threshold as the TICK handler's playTickSound guard in hatMachine.ts —
// kept in sync manually since the machine's guard is an inline lambda.
export function isUrgentTime(timeRemainingSec: number): boolean {
  return timeRemainingSec > 0 && timeRemainingSec <= 10;
}
