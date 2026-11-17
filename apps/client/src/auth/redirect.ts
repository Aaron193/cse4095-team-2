// Where to go after logging in (task P1-D3). A protected page that sends a logged-out visitor
// to /login puts itself in the history state as `from`; logging in goes back there.
import type { Location } from 'react-router';
import { ROUTES } from '../routes.ts';

/** The history state of a visit to /login or /register sent from a protected page. */
export interface RedirectState {
  from: Pick<Location, 'pathname' | 'search' | 'hash'>;
}

/** The path to go to after logging in: `state.from` when it is a page of this app, else `/`. */
export function redirectTarget(state: unknown): string {
  const from = (state as Partial<RedirectState> | null | undefined)?.from;
  const pathname = from?.pathname;
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//')) {
    return ROUTES.home;
  }
  if (pathname === ROUTES.login || pathname === ROUTES.register) return ROUTES.home;
  const search = typeof from?.search === 'string' ? from.search : '';
  const hash = typeof from?.hash === 'string' ? from.hash : '';
  return `${pathname}${search}${hash}`;
}
