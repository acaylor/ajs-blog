// systemd-style state for a post, relative to build time. The site rebuilds on
// every content change, so "new" means new as of the last deploy.

const DAY = 86_400_000;
const RECENT_DAYS = 30;

export interface PostState {
  kind: 'running' | 'reloaded' | 'idle';
  marker: '●' | '○';
  label: string;
  title: string;
}

export function postState(date: Date, updated?: Date, now = Date.now()): PostState {
  if (updated && now - updated.valueOf() < RECENT_DAYS * DAY) {
    const ymd = updated.toISOString().slice(0, 10);
    return {
      kind: 'reloaded',
      marker: '●',
      label: `active (reloaded ${ymd})`,
      title: `updated ${ymd}`,
    };
  }
  if (now - date.valueOf() < RECENT_DAYS * DAY) {
    return {
      kind: 'running',
      marker: '●',
      label: 'active (running)',
      title: `published in the last ${RECENT_DAYS} days`,
    };
  }
  return { kind: 'idle', marker: '○', label: 'active (idle)', title: 'older post' };
}
