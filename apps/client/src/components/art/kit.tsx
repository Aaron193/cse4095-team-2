// Shared pieces for card art (see Docs/card-template.md).
//
// Card art is drawn in the card's own 1000 by 1400 box and sits full-bleed behind the frame.
// Every illustration is a `LitScene`: a background, a character, and foreground props, all
// drawn in plain mid-tone colors, then relit together from one key light. That is what makes
// thirty different characters look like one set.
import type { ReactNode } from 'react';

export interface Point {
  x: number;
  y: number;
}

/** What every card illustration receives from the Card component. */
export interface ArtProps {
  /** A prefix that is unique to this card on the page, for SVG ids. */
  uid: string;
}

/** The ink outline every character and prop is drawn with. */
export const OUTLINE = '#241a33';

/** A small repeatable random source, so procedural backgrounds draw the same every time. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

interface LitSceneProps {
  uid: string;
  /** Where the key light is: the flame, crystal, or cauldron. */
  light: Point;
  /** The key light's color (the card's tag color) and its hot center. */
  lightColor: string;
  lightCore: string;
  /** How far the key light reaches, in card units. */
  reach?: number;
  /** A weaker second light, such as glowing hair or a lantern. */
  secondary?: Point;
  /** Where the character's feet meet the ground, for the cast shadow. */
  feet: Point;
  /** Set to false outdoors, where there is no wall behind the character to catch a shadow. */
  wallShadow?: boolean;
  /** Everything behind the character. */
  background: ReactNode;
  /** The character. Drawn once and reused for the rim lights and the cast shadow. */
  character: ReactNode;
  /** Props in front of the character. */
  foreground?: ReactNode;
  /** Things that give off light (flames, glows, embers). Drawn last and never shaded. */
  emissive?: ReactNode;
}

/**
 * The lighting recipe, the same for every card:
 *   1. the scene in flat mid-tone colors,
 *   2. the character's cast shadow, thrown away from the key light,
 *   3. a cool violet shade over everything, fading out toward the key light,
 *   4. a warm rim on the character's edge facing the key light,
 *   5. a cool moonlight rim on the far edge,
 *   6. the key light's glow, then the light sources themselves.
 */
export function LitScene(props: LitSceneProps) {
  const { uid, light, lightColor, lightCore, feet, reach = 760 } = props;
  const id = (name: string) => `${uid}-art-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  // The rims are the silhouette minus a copy of itself pushed away from the light.
  const away = { x: Math.sign(feet.x - light.x) || -1, y: light.y < feet.y ? 1 : -1 };
  const warmShift = `translate(${away.x * 9} ${away.y * 7})`;
  const coolShift = `translate(${-away.x * 8} ${-2})`;
  // The shadow falls on the wall behind, away from the light and a little larger.
  const shadow = `translate(${feet.x} ${feet.y}) scale(1.06) translate(${-feet.x + away.x * 74} ${-feet.y + 6})`;

  return (
    <g style={{ isolation: 'isolate' }}>
      <defs>
        <filter id={id('white')} colorInterpolationFilters="sRGB">
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" />
        </filter>
        <filter id={id('black')} colorInterpolationFilters="sRGB">
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <filter id={id('soft')}>
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <g id={id('character')}>{props.character}</g>
        <mask id={id('warm-rim')} maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1400">
          <use href={`#${id('character')}`} filter={url('white')} />
          <use href={`#${id('character')}`} filter={url('black')} transform={warmShift} />
        </mask>
        <mask id={id('cool-rim')} maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1400">
          <use href={`#${id('character')}`} filter={url('white')} />
          <use href={`#${id('character')}`} filter={url('black')} transform={coolShift} />
        </mask>
        <radialGradient
          id={id('shade')}
          gradientUnits="userSpaceOnUse"
          cx={light.x}
          cy={light.y}
          r={reach}
        >
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#f1e2e8" />
          <stop offset="0.7" stopColor="#ab9bcc" />
          <stop offset="1" stopColor="#6c62a6" />
        </radialGradient>
        <radialGradient
          id={id('glow')}
          gradientUnits="userSpaceOnUse"
          cx={light.x}
          cy={light.y}
          r={reach * 0.62}
        >
          <stop offset="0" stopColor={lightCore} stopOpacity="0.6" />
          <stop offset="0.3" stopColor={lightColor} stopOpacity="0.3" />
          <stop offset="1" stopColor={lightColor} stopOpacity="0" />
        </radialGradient>
        {props.secondary ? (
          <radialGradient
            id={id('glow-2')}
            gradientUnits="userSpaceOnUse"
            cx={props.secondary.x}
            cy={props.secondary.y}
            r={reach * 0.36}
          >
            <stop offset="0" stopColor={lightCore} stopOpacity="0.45" />
            <stop offset="1" stopColor={lightColor} stopOpacity="0" />
          </radialGradient>
        ) : null}
      </defs>

      {props.background}
      {props.wallShadow === false ? null : (
        <use href={`#${id('character')}`} filter={url('black')} transform={shadow} opacity="0.3" />
      )}
      <use href={`#${id('character')}`} />
      {props.foreground}

      <rect width="1000" height="1400" fill={url('shade')} style={{ mixBlendMode: 'multiply' }} />
      <rect
        width="1000"
        height="1400"
        fill={lightCore}
        opacity="0.75"
        mask={url('warm-rim')}
        style={{ mixBlendMode: 'screen' }}
      />
      <rect
        width="1000"
        height="1400"
        fill="#8fa8ff"
        opacity="0.22"
        mask={url('cool-rim')}
        style={{ mixBlendMode: 'screen' }}
      />
      <rect width="1000" height="1400" fill={url('glow')} style={{ mixBlendMode: 'screen' }} />
      {props.secondary ? (
        <rect width="1000" height="1400" fill={url('glow-2')} style={{ mixBlendMode: 'screen' }} />
      ) : null}
      {props.emissive}
    </g>
  );
}

/** A wall of staggered bricks or stone blocks filling the given box. */
export function BrickWall(props: {
  seed: number;
  x: number;
  y: number;
  width: number;
  height: number;
  colors: string[];
  mortar: string;
  brick?: { width: number; height: number };
}) {
  const { x, y, width, height, colors, mortar } = props;
  const size = props.brick ?? { width: 96, height: 44 };
  const random = seeded(props.seed);
  const bricks: ReactNode[] = [];
  for (let row = 0; row * size.height < height; row++) {
    const offset = row % 2 === 0 ? 0 : -size.width / 2;
    for (let col = 0; offset + col * size.width < width; col++) {
      const bx = x + offset + col * size.width;
      const by = y + row * size.height;
      const color = colors[Math.floor(random() * colors.length)];
      const jitter = Math.floor(random() * 5);
      bricks.push(
        <rect
          key={`${row}-${col}`}
          x={bx + 3}
          y={by + 3}
          width={size.width - 6 - jitter}
          height={size.height - 6}
          rx="5"
          fill={color}
        />,
      );
    }
  }
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={mortar} />
      {bricks}
    </g>
  );
}

/** A floor of cobbles or flagstones in rows that grow toward the viewer. */
export function Cobbles(props: {
  seed: number;
  top: number;
  bottom: number;
  colors: string[];
  gap: string;
}) {
  const random = seeded(props.seed);
  const stones: ReactNode[] = [];
  let y = props.top;
  let rowHeight = 22;
  for (let row = 0; y < props.bottom; row++) {
    const stoneWidth = rowHeight * 2.3;
    let x = -random() * stoneWidth;
    for (let col = 0; x < 1000; col++) {
      const w = stoneWidth * (0.8 + random() * 0.4);
      stones.push(
        <rect
          key={`${row}-${col}`}
          x={x + 3}
          y={y + 3}
          width={w - 6}
          height={rowHeight - 6}
          rx={rowHeight * 0.3}
          fill={props.colors[Math.floor(random() * props.colors.length)]}
        />,
      );
      x += w;
    }
    y += rowHeight;
    rowHeight += 3;
  }
  return (
    <g>
      <rect x="0" y={props.top} width="1000" height={1400 - props.top} fill={props.gap} />
      {stones}
    </g>
  );
}

/** An arched opening with a night sky, a moon, and a skyline seen through it. */
export function NightArch(props: {
  uid: string;
  x: number;
  width: number;
  top: number;
  bottom: number;
  sky: [string, string];
  skyline: string;
  stone: string;
  moon?: Point;
}) {
  const { x, width, top, bottom } = props;
  const r = width / 2;
  const shape = `M${x} ${bottom} V${top + r} A${r} ${r} 0 0 1 ${x + width} ${top + r} V${bottom} Z`;
  const skyId = `${props.uid}-art-arch-sky`;
  const clipId = `${props.uid}-art-arch-clip`;
  const moon = props.moon ?? { x: x + width * 0.72, y: top + r * 0.75 };
  return (
    <g>
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={props.sky[0]} />
          <stop offset="1" stopColor={props.sky[1]} />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={shape} />
        </clipPath>
      </defs>
      <path d={shape} fill={`url(#${skyId})`} />
      <g clipPath={`url(#${clipId})`}>
        <circle cx={moon.x} cy={moon.y} r="44" fill="#ffffff" opacity="0.18" />
        <circle cx={moon.x} cy={moon.y} r="24" fill="#f3f0ff" />
        <path
          fill={props.skyline}
          opacity="0.75"
          d={`M${x} ${bottom} V${bottom - 190} h34 v-46 h30 v70 h26 v-112 l22 -30 l22 30 v96 h30 v-58 h36 v84 h28 v-40 h${width} V${bottom} Z`}
        />
        <path
          fill={props.skyline}
          d={`M${x} ${bottom} V${bottom - 96} h48 v-34 h42 v52 h36 v-70 h44 v60 h40 v-30 h${width} V${bottom} Z`}
        />
      </g>
      <path
        d={shape}
        fill="none"
        stroke={props.stone}
        strokeWidth="34"
        strokeDasharray="52 6"
        strokeLinejoin="round"
      />
      <path d={shape} fill="none" stroke={OUTLINE} strokeWidth="4" opacity="0.6" />
    </g>
  );
}

/** A spiky flame. `points` is a ready-made outline; it is drawn three times, hot in the middle. */
export function Flame(props: {
  at: Point;
  scale?: number;
  colors?: [string, string, string];
  rotate?: number;
}) {
  const [outer, mid, core] = props.colors ?? ['#e8572a', '#f59a2c', '#ffe07a'];
  const shape =
    'M0 0 C-60 -10 -95 -70 -78 -128 L-52 -96 L-70 -200 L-28 -150 L-22 -262 L18 -168 L52 -238 L56 -140 L98 -176 L78 -84 C96 -40 60 0 0 0 Z';
  return (
    <g
      transform={`translate(${props.at.x} ${props.at.y}) rotate(${props.rotate ?? 0}) scale(${props.scale ?? 1})`}
    >
      <path d={shape} fill={outer} />
      <path d={shape} fill={mid} transform="translate(0 -6) scale(0.74)" />
      <path d={shape} fill={core} transform="translate(2 -10) scale(0.46)" />
    </g>
  );
}

/** Drifting sparks around a light. Positions come from the seed, so they never move. */
export function Embers(props: { seed: number; around: Point; color: string; count?: number }) {
  const random = seeded(props.seed);
  const dots: ReactNode[] = [];
  for (let i = 0; i < (props.count ?? 16); i++) {
    const angle = random() * Math.PI * 2;
    const distance = 60 + random() * 380;
    dots.push(
      <circle
        key={i}
        cx={props.around.x + Math.cos(angle) * distance}
        cy={props.around.y + Math.sin(angle) * distance * 0.9}
        r={2 + random() * 4}
        fill={props.color}
        opacity={0.5 + random() * 0.5}
      />,
    );
  }
  return <g>{dots}</g>;
}

/** A cartoon eye: white, iris, pupil, and a highlight toward the light. */
export function Eye(props: { at: Point; rx: number; ry: number; iris: string; look?: Point }) {
  const look = props.look ?? { x: 0, y: 0 };
  const cx = props.at.x + look.x;
  const cy = props.at.y + look.y;
  return (
    <g>
      <ellipse cx={props.at.x} cy={props.at.y} rx={props.rx} ry={props.ry} fill="#fffaf0" />
      <circle cx={cx} cy={cy} r={props.rx * 0.52} fill={props.iris} />
      <circle cx={cx} cy={cy} r={props.rx * 0.26} fill="#1a1020" stroke="none" />
      <circle
        cx={cx + props.rx * 0.2}
        cy={cy - props.rx * 0.22}
        r={props.rx * 0.13}
        fill="#ffffff"
        stroke="none"
      />
    </g>
  );
}
