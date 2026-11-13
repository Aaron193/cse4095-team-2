// Where logging in goes back to (task P1-D3).
import { describe, expect, it } from 'vitest';
import { redirectTarget } from './redirect.ts';

describe('redirectTarget', () => {
  it('goes to / when no page sent the visitor', () => {
    for (const state of [undefined, null, 'x', {}, { from: null }, { from: {} }]) {
      expect(redirectTarget(state)).toBe('/');
    }
  });

  it('goes back to the page that sent the visitor, with its query and hash', () => {
    const from = { pathname: '/play/test-fight', search: '?n=2', hash: '#log' };
    expect(redirectTarget({ from })).toBe('/play/test-fight?n=2#log');
    expect(redirectTarget({ from: { pathname: '/profile' } })).toBe('/profile');
  });

  it('only goes to pages of this app', () => {
    for (const pathname of ['//evil.example/', 'https://evil.example/', 'profile', 42]) {
      expect(redirectTarget({ from: { pathname, search: '', hash: '' } })).toBe('/');
    }
  });

  it('never goes back to the login or register screen', () => {
    expect(redirectTarget({ from: { pathname: '/login', search: '', hash: '' } })).toBe('/');
    expect(redirectTarget({ from: { pathname: '/register', search: '', hash: '' } })).toBe('/');
  });
});
