// Draws one card from its definition as one SVG (task P0-C3). The frame and text are SVG and
// CSS only; the art is an SVG scene or, for some characters, a painted image.
//
// The layout is the team's card template, in its 1000 by 1400 box: full-bleed art behind a
// gold-trimmed ink frame, a hex cost gem top left, the name banner across the top, a type
// ribbon in the tag's color, and a translucent rules panel. The art here is a placeholder
// scene lit in the tag's color; a character illustration replaces it card by card.
//
// Art comes from `art/index.ts` (SVG scenes) or `art/paintings.ts` (painted WebP images), by
// card id. A card with neither gets a placeholder lit in its tag's color.
// Docs/card-template.md explains how to add a character.
//
// `CardDef` (TODO.md, Reference R4) has no HP or flavor text, so the template's HP heart and
// flavor line are drawn only when those are passed in as props.
import { useId } from 'react';
import type { CardDef, Tag } from '@daily-delve/shared';
import { CARD_ART } from './art/index.ts';
import { CARD_PAINTINGS } from './art/paintings.ts';
import './Card.css';

/** The CSS class that colors a card by tag, for example "card--fire". */
export function tagClass(tag: Tag): string {
  return `card--${tag.toLowerCase()}`;
}

/** "Kip, the Matchstick Kid" is drawn as the name KIP over the title "the Matchstick Kid". */
export function splitName(fullName: string): { name: string; title: string | null } {
  const comma = fullName.indexOf(',');
  if (comma === -1) return { name: fullName.trim(), title: null };
  return { name: fullName.slice(0, comma).trim(), title: fullName.slice(comma + 1).trim() };
}

/** Words drawn in an element's color wherever they appear in rules text. */
const KEYWORD_TAGS: Record<string, Tag> = {
  Burn: 'Fire',
  Fire: 'Fire',
  Chill: 'Frost',
  Frost: 'Frost',
  Shatter: 'Frost',
  Poison: 'Poison',
};
const RULES_TOKEN = new RegExp(`(\\d+|\\b(?:${Object.keys(KEYWORD_TAGS).join('|')})\\b)`);

/** Rules text with numbers in gold and keywords in their element's color. */
function RulesText({ text }: { text: string }) {
  const size =
    text.length > 80 ? 'card__text--small' : text.length > 44 ? 'card__text--medium' : '';
  return (
    <p className={`card__text ${size}`.trim()}>
      {text.split(RULES_TOKEN).map((part, i) => {
        if (/^\d+$/.test(part)) {
          return (
            <span key={i} className="card__num">
              {part}
            </span>
          );
        }
        const tag = KEYWORD_TAGS[part];
        if (tag) {
          return (
            <span key={i} className={`card__kw card__kw--${tag.toLowerCase()}`}>
              {part}
            </span>
          );
        }
        return part;
      })}
    </p>
  );
}

/** Placeholder art per tag, drawn in a 100 by 70 box and scaled up into the art window. */
function TagGlyph({ tag }: { tag: Tag }) {
  switch (tag) {
    case 'Fire':
      return (
        <>
          <path
            className="card__art-glyph"
            d="M50 6 C58 20 71 27 69 44 C68 57 60 64 50 64 C40 64 32 57 31 44 C30 36 35 30 40 25 C41 32 44 36 47 36 C46 26 46 15 50 6 Z"
          />
          <path
            className="card__art-glyph--core"
            d="M50 30 C54 38 59 42 58 50 C57 57 54 60 50 60 C46 60 43 57 42 50 C42 46 44 43 46 41 C47 44 48 45 49 45 C49 40 49 35 50 30 Z"
          />
        </>
      );
    case 'Frost':
      return (
        <g className="card__art-glyph--line">
          <path d="M50 8 V62 M26.6 21.5 L73.4 48.5 M73.4 21.5 L26.6 48.5" />
          <path d="M43 13 L50 20 L57 13 M43 57 L50 50 L57 57" />
          <path d="M27 30 L36.5 27.2 L34 17.6 M73 40 L63.5 42.8 L66 52.4" />
          <path d="M73 30 L63.5 27.2 L66 17.6 M27 40 L36.5 42.8 L34 52.4" />
        </g>
      );
    case 'Poison':
      return (
        <>
          <path
            className="card__art-glyph"
            d="M50 6 C58 23 69 33 69 46 C69 57 60 64 50 64 C40 64 31 57 31 46 C31 33 42 23 50 6 Z"
          />
          <path
            className="card__art-glyph--core"
            d="M42 42 C40 48 42 54 47 57 C44 52 43 47 44 42 Z"
          />
        </>
      );
  }
}

/** Fixed spark positions (x, y, radius) so every card draws the same way every time. */
const SPARKS: [number, number, number][] = [
  [212, 300, 5],
  [318, 204, 4],
  [742, 252, 6],
  [806, 398, 4],
  [168, 520, 4],
  [846, 600, 5],
  [272, 690, 3],
  [700, 742, 4],
  [596, 190, 3],
  [404, 800, 3],
];

/** One corner flourish, drawn for the top-left corner and mirrored into the other three. */
function Corner({ transform, stroke }: { transform: string; stroke: string }) {
  return (
    <g transform={transform}>
      <path className="card__ornament" stroke={stroke} d="M14 78 V30 Q14 14 30 14 H78" />
      <path className="card__ornament" stroke={stroke} d="M30 62 Q30 30 62 30" />
      <circle className="card__ornament-dot" cx="40" cy="40" r="5" />
    </g>
  );
}

/** The hexagon of the cost gem: center (102, 102). */
function hexPoints(radius: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = 102 + radius * Math.cos(angle);
    const y = 102 + radius * Math.sin(angle);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

const GEM_OUTER = hexPoints(56);
const GEM_INNER = hexPoints(38);

export interface CardProps {
  card: CardDef;
  /** A line of flavor text under the rules. `CardDef` has none, so it is passed separately. */
  flavor?: string;
  /** Draws the HP heart in the bottom-right corner. `CardDef` has no HP, so it is passed in. */
  hp?: number;
}

export function Card({ card, flavor, hp }: CardProps) {
  // Gradients are referenced by id, and ids must be unique on a page that shows many cards.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `card-${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  const primary = card.tags[0];
  // One color class per tag. The first tag also sets the card's accent color.
  const classes = ['card', ...card.tags.map(tagClass)];
  if (primary) classes.push(`card--primary-${primary.toLowerCase()}`);
  if (card.rarity === 'rare') classes.push('card--rare');

  const { name, title } = splitName(card.name);
  const displayName = name.toUpperCase();
  // Cinzel Decorative capitals are wide; shrink long names to fit the 700-unit banner.
  const nameSize = Math.min(56, Math.floor(700 / (displayName.length * 0.86)));
  const nameY = title ? 92 : 86 + Math.round(nameSize * 0.36);

  const typeWords = [card.type, ...card.tags, card.rarity].map((word) => word.toUpperCase());
  const typeLine = typeWords.join(' · ');
  // The ribbon holds about 24 characters at full size; squeeze longer lines to fit.
  const squeeze = typeLine.length > 24 ? { textLength: 500, lengthAdjust: 'spacingAndGlyphs' } : {};

  const rulesBottom = flavor ? 1196 : 1326;
  const Art = CARD_ART[card.id];
  const painting = Art ? undefined : CARD_PAINTINGS[card.id];

  return (
    <article className={classes.join(' ')} aria-label={card.name} data-card-id={card.id}>
      <svg className="card__svg" viewBox="0 0 1000 1400" role="presentation">
        <defs>
          <linearGradient id={id('gold')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="card__stop-gold-hi" />
            <stop offset="0.45" className="card__stop-gold" />
            <stop offset="0.75" className="card__stop-gold-lo" />
            <stop offset="1" className="card__stop-gold-hi" />
          </linearGradient>
          <linearGradient id={id('name')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="card__stop-gold-hi" />
            <stop offset="1" className="card__stop-gold" />
          </linearGradient>
          <linearGradient id={id('ribbon')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="card__stop-accent" />
            <stop offset="1" className="card__stop-accent-deep" />
          </linearGradient>
          <radialGradient id={id('gem')} cx="0.4" cy="0.3" r="0.8">
            <stop offset="0" className="card__stop-accent" />
            <stop offset="1" className="card__stop-accent-deep" />
          </radialGradient>
          <linearGradient id={id('panel')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="card__stop-ink-2" stopOpacity="0.72" />
            <stop offset="1" className="card__stop-ink" stopOpacity="0.94" />
          </linearGradient>
          <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="card__stop-ink-3" />
            <stop offset="0.6" className="card__stop-ink-2" />
            <stop offset="1" className="card__stop-ink" />
          </linearGradient>
          <radialGradient id={id('light')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" className="card__stop-light" stopOpacity="0.55" />
            <stop offset="0.25" className="card__stop-accent" stopOpacity="0.5" />
            <stop offset="0.7" className="card__stop-accent-deep" stopOpacity="0.18" />
            <stop offset="1" className="card__stop-accent-deep" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id('vignette')} cx="0.5" cy="0.42" r="0.75">
            <stop offset="0.55" className="card__stop-ink" stopOpacity="0" />
            <stop offset="1" className="card__stop-ink" stopOpacity="0.85" />
          </radialGradient>
          <clipPath id={id('window')}>
            <rect x="26" y="26" width="948" height="1348" rx="26" />
          </clipPath>
        </defs>

        <rect className="card__body" width="1000" height="1400" rx="40" />

        {/* Art: full bleed behind the frame. A character scene, a painting, or the tag's
            placeholder. */}
        <g className="card__art" clipPath={url('window')} aria-hidden="true">
          {Art ? (
            <Art uid={`card-${uid}`} />
          ) : painting ? (
            <image
              className="card__painting"
              href={painting}
              x="26"
              y="26"
              width="948"
              height="1348"
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <>
              <rect x="26" y="26" width="948" height="1348" fill={url('sky')} />
              <ellipse cx="500" cy="540" rx="520" ry="500" fill={url('light')} />
              <rect className="card__art-floor" x="26" y="850" width="948" height="524" />
              <ellipse className="card__art-shadow" cx="500" cy="880" rx="210" ry="30" />
              {SPARKS.map(([x, y, r]) => (
                <circle key={`${x}-${y}`} className="card__art-spark" cx={x} cy={y} r={r} />
              ))}
              {primary ? (
                <g transform="translate(500 540) scale(9.4) translate(-50 -36)">
                  <TagGlyph tag={primary} />
                </g>
              ) : null}
            </>
          )}
          <rect x="26" y="26" width="948" height="1348" fill={url('vignette')} />
        </g>

        {/* Frame. */}
        <rect
          className="card__trim"
          x="21"
          y="21"
          width="958"
          height="1358"
          rx="30"
          stroke={url('gold')}
        />
        <rect className="card__trim-accent" x="31" y="31" width="938" height="1338" rx="22" />
        <g aria-hidden="true">
          <Corner transform="translate(22 22)" stroke={url('gold')} />
          <Corner transform="translate(978 22) scale(-1 1)" stroke={url('gold')} />
          <Corner transform="translate(22 1378) scale(1 -1)" stroke={url('gold')} />
          <Corner transform="translate(978 1378) scale(-1 -1)" stroke={url('gold')} />
        </g>

        {/* Name banner. */}
        <path
          className="card__banner"
          stroke={url('gold')}
          d="M172 36 H916 L942 86 L916 136 H172 Z"
        />
        <path className="card__banner-inner" d="M182 46 H909 L930 86 L909 126 H182 Z" />
        <g role="heading" aria-level={3} aria-label={card.name}>
          <text className="card__name" x="552" y={nameY} fontSize={nameSize} fill={url('name')}>
            {displayName}
          </text>
          {title ? (
            <text className="card__title" x="552" y="125">
              {title}
            </text>
          ) : null}
        </g>

        {/* Cost gem. */}
        <circle className="card__gem-ring" cx="102" cy="102" r="74" fill={url('gold')} />
        <circle cx="102" cy="102" r="62" className="card__body" />
        <polygon points={GEM_OUTER} fill={url('gem')} />
        <polygon className="card__gem-facet" points={GEM_INNER} />
        <text className="card__cost" x="102" y="131" aria-label={`Cost ${card.cost}`}>
          {card.cost}
        </text>

        {/* Rules panel. */}
        <rect
          className="card__panel"
          x="62"
          y="1004"
          width="876"
          height="348"
          rx="10"
          fill={url('panel')}
          stroke={url('gold')}
        />
        <rect className="card__panel-inner" x="72" y="1014" width="856" height="328" rx="6" />
        <foreignObject x="96" y="1036" width="808" height={rulesBottom - 1036}>
          <div className="card__rules">
            <RulesText text={card.text} />
          </div>
        </foreignObject>
        {flavor ? (
          <>
            <g aria-hidden="true">
              <path className="card__divider-line" d="M400 1218 H472 M528 1218 H600" />
              <path className="card__divider-gem" d="M500 1206 L512 1218 L500 1230 L488 1218 Z" />
            </g>
            <text className="card__flavor" x="500" y="1276">
              {flavor}
            </text>
          </>
        ) : null}

        {/* HP heart. */}
        {hp === undefined ? null : (
          <g>
            <path
              className="card__heart"
              stroke={url('gold')}
              d="M888 1346 C836 1310 818 1280 818 1256 C818 1232 836 1216 856 1216 C870 1216 882 1224 888 1236 C894 1224 906 1216 920 1216 C940 1216 958 1232 958 1256 C958 1280 940 1310 888 1346 Z"
            />
            <text className="card__hp" x="888" y="1296" aria-label={`${hp} HP`}>
              {hp}
            </text>
            <text className="card__hp-label" x="888" y="1324" aria-hidden="true">
              HP
            </text>
          </g>
        )}

        {/* Type ribbon, over the top edge of the rules panel. */}
        <path className="card__ribbon-tail" d="M232 972 H190 L212 996 L190 1020 H232 Z" />
        <path className="card__ribbon-tail" d="M768 972 H810 L788 996 L810 1020 H768 Z" />
        <path
          className="card__ribbon"
          fill={url('ribbon')}
          d="M246 960 H754 L768 990 L754 1020 H246 L232 990 Z"
        />
        <text className="card__ribbon-text" x="500" y="999" {...squeeze}>
          {typeWords.map((word, i) => (
            <tspan key={word} className={i >= 1 && i <= card.tags.length ? 'card__tag' : undefined}>
              {i > 0 ? ' · ' : ''}
              {word}
            </tspan>
          ))}
        </text>
      </svg>
    </article>
  );
}
