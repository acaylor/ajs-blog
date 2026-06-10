import { execSync } from 'node:child_process';

function git(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

// Evaluated once per build process (module scope), not per page render.
export const commitSha = git('git rev-parse --short HEAD');
export const buildYmd = new Date().toISOString().slice(0, 10);
export const buildVersion = buildYmd.replaceAll('-', '.');
