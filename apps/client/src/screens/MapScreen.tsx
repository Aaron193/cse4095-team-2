// The dungeon screen (task P2-C1; Docs/screens.md, Dungeon). It draws `state.dungeon` on a
// canvas, and lists every site with its type and state as text beside it, so the screen can
// be read and tested without the canvas. Moving (task P2-C2) is added on top of this.
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { MapNode, RunState } from '@daily-delve/shared';
import { DeckButton } from '../components/DeckViewer.tsx';
import { drawDungeon, TILE } from '../game/map/render.ts';
import type { MapView } from '../game/map/render.ts';
import './MapScreen.css';

export const SITE_LABELS: Record<MapNode['type'], string> = {
  fight: 'Fight',
  elite: 'Elite',
  shrine: 'Shrine',
  boss: 'Boss',
};

/** "(4, 8)": a tile, as x then y, counted from the top-left corner. */
export function tileName({ x, y }: { x: number; y: number }): string {
  return `(${x}, ${y})`;
}

/** The dungeon drawn on a canvas, scaled to its box with square pixels. */
export function DungeonCanvas({ state }: { state: MapView }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx) drawDungeon(ctx, state);
  }, [state]);
  const { width, height } = state.dungeon;
  return (
    <canvas
      ref={canvas}
      className="map__canvas"
      width={width * TILE}
      height={height * TILE}
      style={{ aspectRatio: `${width} / ${height}` }}
      aria-hidden="true"
    />
  );
}

export interface MapScreenProps {
  state: RunState;
  /** The place shown at the top of the screen. */
  place?: string;
  /** More buttons for the status bar, beside the Deck button. */
  tools?: ReactNode;
}

export function MapScreen({ state, place = 'The Sunken Halls', tools }: MapScreenProps) {
  const { dungeon } = state;
  const here = dungeon.nodes.find((node) => node.x === state.pos.x && node.y === state.pos.y);

  return (
    <div className="map">
      <header className="map__bar">
        <h1 className="map__place">{place}</h1>
        <dl className="map__stats">
          <div className="map__stat">
            <dt>HP</dt>
            <dd>
              {state.hp} / {state.maxHp}
            </dd>
          </div>
          <div className="map__stat">
            <dt>Sites</dt>
            <dd>
              {state.nodesCleared} / {dungeon.nodes.length}
            </dd>
          </div>
          <div className="map__stat">
            <dt>Steps</dt>
            <dd>{state.stats.steps}</dd>
          </div>
        </dl>
        <div className="map__tools">
          {tools}
          <DeckButton deck={state.deck} />
        </div>
      </header>

      <div className="map__body">
        <figure className="map__board">
          <DungeonCanvas state={state} />
          <figcaption className="map__legend">
            <span>
              <i className="map__swatch map__swatch--start" /> Start
            </span>
            <span>
              <i className="map__swatch map__swatch--brambles" /> Brambles (Fire)
            </span>
            <span>
              <i className="map__swatch map__swatch--water" /> Water (Frost)
            </span>
            <span>
              <i className="map__swatch map__swatch--bars" /> Bars (Poison)
            </span>
          </figcaption>
        </figure>

        <aside className="map__side">
          <p className="map__position" role="status">
            You stand at <strong>{tileName(state.pos)}</strong>
            {here ? ` on the ${SITE_LABELS[here.type].toLowerCase()} site ${here.id}` : ''}.
          </p>
          <h2 className="map__sites-title" id="map-sites">
            Sites
          </h2>
          <ol className="map__sites" aria-labelledby="map-sites">
            {dungeon.nodes.map((node) => {
              const cleared = state.cleared.includes(node.id);
              return (
                <li
                  key={node.id}
                  className={`map__site map__site--${node.type}${cleared ? ' map__site--cleared' : ''}`}
                  aria-label={`${node.id}: ${SITE_LABELS[node.type]} at ${tileName(node)}, ${cleared ? 'cleared' : 'not cleared'}`}
                >
                  <span className="map__site-id">{node.id}</span>
                  <span className="map__site-type">{SITE_LABELS[node.type]}</span>
                  <span className="map__site-tile">{tileName(node)}</span>
                  <span className="map__site-state">{cleared ? 'Cleared' : ''}</span>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}
