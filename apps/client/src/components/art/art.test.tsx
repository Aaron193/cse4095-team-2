import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CARD_ART } from './index.ts';
import { seeded } from './kit.tsx';

describe('card art', () => {
  it.each(Object.keys(CARD_ART))('%s draws a lit scene with no image files', (cardId) => {
    const Art = CARD_ART[cardId]!;
    const { container } = render(
      <svg viewBox="0 0 1000 1400">
        <Art uid="test" />
      </svg>,
    );
    // The lighting recipe: one character, reused for the rims, under a shade and a glow.
    expect(container.querySelector('#test-art-character')).not.toBeNull();
    expect(container.querySelector('#test-art-warm-rim')).not.toBeNull();
    expect(container.querySelector('#test-art-cool-rim')).not.toBeNull();
    expect(container.querySelector('#test-art-shade')).not.toBeNull();
    expect(container.querySelector('#test-art-glow')).not.toBeNull();
    expect(container.querySelector('img, image')).toBeNull();
  });

  it.each(Object.keys(CARD_ART))('%s draws the same way every time', (cardId) => {
    const Art = CARD_ART[cardId]!;
    const draw = () =>
      render(
        <svg viewBox="0 0 1000 1400">
          <Art uid="test" />
        </svg>,
      ).container.innerHTML;
    expect(draw()).toBe(draw());
  });

  it('prefixes every id with the uid it is given, so two cards never share one', () => {
    const Art = CARD_ART.kip!;
    const { container } = render(
      <svg viewBox="0 0 1000 1400">
        <Art uid="one" />
        <Art uid="two" />
      </svg>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('one-art-') || id.startsWith('two-art-'))).toBe(true);
  });
});

describe('seeded', () => {
  it('repeats for the same seed and differs for another', () => {
    const a = seeded(7);
    const b = seeded(7);
    const c = seeded(8);
    const fromA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(fromA);
    expect([c(), c(), c()]).not.toEqual(fromA);
    expect(fromA.every((n) => n >= 0 && n < 1)).toBe(true);
  });
});
