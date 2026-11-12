// Draws one card from its definition, with SVG and CSS only: no image files (task P0-C3).
// Layout: cost gem top left, name banner, art window lit in the tag's color, a type ribbon
// in the tag's color, then the rules text.
import type { CardDef, Tag } from '@daily-delve/shared';
import './Card.css';

/** The CSS class that colors a card or a tag label, for example "card--fire". */
export function tagClass(tag: Tag): string {
  return `card--${tag.toLowerCase()}`;
}

/** Placeholder art per tag, drawn in a 100 by 70 box. Real art replaces this later. */
function TagGlyph({ tag }: { tag: Tag }) {
  switch (tag) {
    case 'Fire':
      return (
        <path
          className="card__art-glyph"
          d="M50 8 C58 22 70 28 68 44 C67 56 59 63 50 63 C41 63 33 56 32 44 C31 36 36 31 40 26 C41 33 44 36 47 36 C46 26 46 16 50 8 Z"
        />
      );
    case 'Frost':
      return (
        <g className="card__art-glyph card__art-glyph--line">
          <path d="M50 10 V60 M28 22 L72 48 M72 22 L28 48" />
          <path d="M43 15 L50 22 L57 15 M43 55 L50 48 L57 55" />
        </g>
      );
    case 'Poison':
      return (
        <path
          className="card__art-glyph"
          d="M50 8 C58 24 68 34 68 46 C68 56 60 63 50 63 C40 63 32 56 32 46 C32 34 42 24 50 8 Z"
        />
      );
  }
}

export interface CardProps {
  card: CardDef;
}

export function Card({ card }: CardProps) {
  const primary = card.tags[0];
  // One color class per tag. The first tag also sets the card's accent color.
  const classes = ['card', ...card.tags.map(tagClass)];
  if (primary) classes.push(`card--primary-${primary.toLowerCase()}`);
  if (card.rarity === 'rare') classes.push('card--rare');
  const multi = card.tags.length > 1;

  return (
    <article className={classes.join(' ')} aria-label={card.name} data-card-id={card.id}>
      <span className="card__cost" aria-label={`Cost ${card.cost}`}>
        {card.cost}
      </span>
      <h3 className="card__name">{card.name}</h3>
      <svg
        className="card__art"
        viewBox="0 0 100 70"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <rect className="card__art-sky" width="100" height="70" />
        <ellipse className="card__art-glow" cx="50" cy="40" rx="34" ry="28" />
        {primary ? <TagGlyph tag={primary} /> : null}
      </svg>
      <p className={multi ? 'card__ribbon card__ribbon--multi' : 'card__ribbon'}>
        <span className="card__type">{card.type}</span>
        {card.tags.map((tag) => (
          <span key={tag} className={`card__tag card__tag--${tag.toLowerCase()}`}>
            {tag}
          </span>
        ))}
      </p>
      <p className="card__text">{card.text}</p>
    </article>
  );
}
