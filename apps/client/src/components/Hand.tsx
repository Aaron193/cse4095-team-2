// The hand (task P1-C4), drawn as a fan of cards. A card with no legal play is disabled and
// does nothing when clicked. Clicking a playable card either plays it (no target needed) or
// selects it, and the combat screen then plays it on the enemy clicked next (useCardPlay).
import type { CSSProperties } from 'react';
import { CARDS } from '@daily-delve/shared';
import type { CardPlay } from '../game/useCardPlay.ts';
import { Card } from './Card.tsx';
import './Hand.css';

export interface HandProps {
  hand: readonly string[];
  /** The playable cards, by hand index (from cardPlays of legalActions). */
  plays: ReadonlyMap<number, CardPlay>;
  /** The card waiting for a target, or null. */
  selected: number | null;
  onCardClick: (handIndex: number) => void;
}

/**
 * Keys that stay with a card when the cards before it leave the hand: the card id and how
 * many copies of it come earlier. So the fan closes up smoothly instead of redrawing.
 */
function handKeys(hand: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return hand.map((id) => {
    const copy = seen.get(id) ?? 0;
    seen.set(id, copy + 1);
    return `${id}#${copy}`;
  });
}

export function Hand({ hand, plays, selected, onCardClick }: HandProps) {
  const keys = handKeys(hand);
  const middle = (hand.length - 1) / 2;
  return (
    <ol className="hand" aria-label="Your hand">
      {hand.map((cardId, handIndex) => {
        const card = CARDS[cardId];
        if (!card) return null;
        const play = plays.get(handIndex);
        const offset = handIndex - middle;
        const style = {
          '--offset': offset,
          '--offset-abs': Math.abs(offset),
          zIndex: handIndex + 1,
        } as CSSProperties;
        const classes = ['hand__slot'];
        if (!play) classes.push('hand__slot--unplayable');
        if (selected === handIndex) classes.push('hand__slot--selected');
        const needsTarget = play?.targets !== null && play !== undefined;
        return (
          <li key={keys[handIndex]} className={classes.join(' ')} style={style}>
            <div className="hand__card">
              <Card card={card} />
            </div>
            <button
              type="button"
              className="hand__hit"
              aria-label={`${card.name}: ${card.text} Cost ${card.cost}.`}
              aria-pressed={needsTarget ? selected === handIndex : undefined}
              disabled={!play}
              onClick={() => onCardClick(handIndex)}
            />
          </li>
        );
      })}
    </ol>
  );
}
