import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

function git(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

// Read from the installed package rather than the `astro` range in package.json —
// the range is `^7.2.0`, which is not what actually built the site. This was
// previously hardcoded in the banner and silently went stale across the 6 -> 7
// upgrade; resolving it means it cannot drift again.
function astroVersion(): string {
  try {
    return createRequire(import.meta.url)('astro/package.json').version;
  } catch {
    return 'unknown';
  }
}

// Evaluated once per build process (module scope), not per page render.
export const commitSha = git('git rev-parse --short HEAD');
const builtAt = new Date();
export const buildYmd = builtAt.toISOString().slice(0, 10);
// tmux's default status-right clock format (%H:%M %d-%b-%y), in UTC, e.g. "04:12 25-Sep-26".
export const buildClock = `${builtAt.toISOString().slice(11, 16)} ${String(builtAt.getUTCDate()).padStart(2, '0')}-${builtAt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}-${String(builtAt.getUTCFullYear()).slice(2)}`;
export const buildVersion = buildYmd.replaceAll('-', '.');
export const astroRelease = astroVersion();
