// The game store (task P1-C1). It holds the seed, every action taken so far, and the state
// they lead to. The UI changes the game only through `dispatch`, and the engine decides what
// each action does: the UI never works out a game result itself (Docs/screens.md).
import { useCallback, useReducer } from 'react';
import { applyAction, createTestFight } from '@daily-delve/shared';
import type { Action, ApplyResult, EngineError, RunState } from '@daily-delve/shared';

/** The two engine calls the store needs. Tests pass a fake one. */
export interface GameEngine {
  /** The state a game on this seed starts in. */
  start: (seed: string) => RunState;
  applyAction: (state: RunState, action: Action) => ApplyResult;
}

/** Phase 1: the test fight on the real engine (task P1-C5). */
export const TEST_FIGHT_ENGINE: GameEngine = { start: createTestFight, applyAction };

export interface GameSnapshot {
  seed: string;
  /** Every accepted action, in order. Replaying them from `seed` gives `state`. */
  actions: readonly Action[];
  state: RunState;
  /** Why the last dispatched action was refused, or null when it was accepted. */
  error: EngineError | null;
}

export function startGame(engine: GameEngine, seed: string): GameSnapshot {
  return { seed, actions: [], state: engine.start(seed), error: null };
}

/**
 * One action through the engine. An accepted action is appended and its state replaces the
 * old one. A refused action changes nothing except `error`, which reports why.
 */
export function stepGame(engine: GameEngine, game: GameSnapshot, action: Action): GameSnapshot {
  const result = engine.applyAction(game.state, action);
  if (!result.ok) return { ...game, error: result.error };
  return { seed: game.seed, actions: [...game.actions, action], state: result.state, error: null };
}

type StoreEvent = { kind: 'dispatch'; action: Action } | { kind: 'restart'; seed: string };

export interface Game extends GameSnapshot {
  dispatch: (action: Action) => void;
  /** Throws the game away and starts a new one on `seed`. */
  restart: (seed: string) => void;
}

export function useGame(seed: string, engine: GameEngine = TEST_FIGHT_ENGINE): Game {
  const [game, send] = useReducer(
    (current: GameSnapshot, event: StoreEvent): GameSnapshot =>
      event.kind === 'dispatch'
        ? stepGame(engine, current, event.action)
        : startGame(engine, event.seed),
    seed,
    (first: string) => startGame(engine, first),
  );
  const dispatch = useCallback((action: Action) => send({ kind: 'dispatch', action }), []);
  const restart = useCallback((next: string) => send({ kind: 'restart', seed: next }), []);
  return { ...game, dispatch, restart };
}
