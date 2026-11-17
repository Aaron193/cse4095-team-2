// The test environment (src/test/jsdom-environment.ts): jsdom for the page, and Node's fetch
// with the classes it accepts. With jsdom's AbortSignal, Node 24's fetch threw on every request
// made with a signal, so a restored session came back as logged out.
import { describe, expect, it } from 'vitest';
import { getMe } from '../api/client.ts';
import { DEMO_USERNAME, logInAs } from '../mocks/data.ts';

describe('the test environment', () => {
  it('is jsdom', () => {
    expect(document.body).toBeInstanceOf(HTMLElement);
    expect(window.location.origin).toBe('http://localhost:3000');
  });

  it("has the AbortSignal and Headers that Node's fetch uses", () => {
    const request = new Request('http://localhost:3000/', {
      signal: new AbortController().signal,
    });
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(request.headers).toBeInstanceOf(Headers);
  });

  it('sends a request made with a signal to the mock API', async () => {
    logInAs(DEMO_USERNAME);
    const { signal } = new AbortController();
    await expect(getMe({ signal })).resolves.toMatchObject({
      user: { username: DEMO_USERNAME },
    });
  });
});
