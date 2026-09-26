// dmesg timestamps are seconds since boot. Here "boot" is the moment a page
// starts rendering at build time: Banner resets the clock, and every later
// stamp on that page (banner rows, module dividers) is the real elapsed render
// time, so the numbers are measurements rather than decoration. Keyed by
// pathname so concurrent page renders don't share a clock.

const clocks = new Map<string, bigint>();

export function resetClock(path: string): void {
  clocks.set(path, process.hrtime.bigint());
}

export function nextTs(path: string): string {
  let start = clocks.get(path);
  if (start === undefined) {
    start = process.hrtime.bigint();
    clocks.set(path, start);
  }
  const ns = process.hrtime.bigint() - start;
  return (Number(ns) / 1e9).toFixed(6);
}
