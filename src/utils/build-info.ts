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
export const buildYmd = new Date().toISOString().slice(0, 10);
export const buildVersion = buildYmd.replaceAll('-', '.');
export const astroRelease = astroVersion();
