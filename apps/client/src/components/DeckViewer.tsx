// The deck viewer (task P2-C5; Docs/screens.md, Reward and deck): a modal listing the run's
// deck, grouped by card with counts. It reads `deck` only and dispatches nothing. The Deck
// button that opens it sits on the dungeon, combat, and reward screens.
import { useEffect, useId, useRef, useState } from 'react';
import { CARDS } from '@daily-delve/shared';
import type { CardDef } from '@daily-delve/shared';
import { Button } from './ui/Button.tsx';
import './DeckViewer.css';

export interface DeckGroup {
  id: string;
  card: CardDef | undefined;
  count: number;
}

/** The deck as one entry per card id: most copies first, then by name, then by id. */
export function groupDeck(deck: readonly string[]): DeckGroup[] {
  const counts = new Map<string, number>();
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
  const name = (id: string) => CARDS[id]?.name ?? id;
  return [...counts]
    .map(([id, count]) => ({ id, card: CARDS[id], count }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        (name(a.id) < name(b.id) ? -1 : name(a.id) > name(b.id) ? 1 : 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
}

export interface DeckViewerProps {
  deck: readonly string[];
  onClose: () => void;
}

export function DeckViewer({ deck, onClose }: DeckViewerProps) {
  const titleId = useId();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const groups = groupDeck(deck);
  return (
    <div
      className="deck-viewer"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="deck-viewer__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="deck-viewer__head">
          <h2 id={titleId} className="deck-viewer__title">
            Your deck ({deck.length} {deck.length === 1 ? 'card' : 'cards'})
          </h2>
          <button
            ref={close}
            type="button"
            className="deck-viewer__close"
            aria-label="Close the deck"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {groups.length === 0 ? (
          <p className="deck-viewer__empty">The deck is empty.</p>
        ) : (
          <ul className="deck-viewer__list">
            {groups.map(({ id, card, count }) => (
              <li
                key={id}
                className={`deck-viewer__row deck-viewer__row--${(card?.tags[0] ?? 'none').toLowerCase()}`}
                aria-label={`${card?.name ?? id}, ${count} ${count === 1 ? 'copy' : 'copies'}`}
              >
                <span className="deck-viewer__cost" title="Energy cost">
                  {card?.cost ?? '?'}
                </span>
                <span className="deck-viewer__name">
                  {card?.name ?? id}
                  {card ? (
                    <span className="deck-viewer__meta">
                      {card.type} · {card.tags.join(' / ')}
                      {card.rarity === 'rare' ? ' · Rare' : ''}
                    </span>
                  ) : null}
                </span>
                <span className="deck-viewer__count">×{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** A "Deck (10)" button that opens the deck viewer. */
export function DeckButton({ deck }: { deck: readonly string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Deck ({deck.length})
      </Button>
      {open ? <DeckViewer deck={deck} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
