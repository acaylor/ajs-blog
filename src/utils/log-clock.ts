// Fake-but-plausible dmesg timestamps. Banner starts the clock for a page;
// every subsequent tick (banner rows, module dividers) advances it by a
// deterministic, growing step so timestamps read down the page like a real
// boot log. Keyed by pathname so concurrent page renders don't interleave.

const clocks = new Map<string, { t: number; i: number }>();

/** FNV-1a hash mapped to [0, 1) — deterministic jitter so builds are stable. */
function jitter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function resetClock(path: string): void {
  clocks.set(path, { t: 0, i: 0 });
}

export function nextTs(path: string): string {
  let clock = clocks.get(path);
  if (!clock) {
    clock = { t: 0, i: 0 };
    clocks.set(path, clock);
  }
  if (clock.i > 0) {
    const step = 0.0001 * 3 ** Math.min(clock.i, 8);
    clock.t += step * (0.5 + jitter(`${path}#${clock.i}`));
  }
  clock.i += 1;
  return clock.t.toFixed(6);
}
