import { act, renderHook } from '@testing-library/react';
import type { Action, ApplyResult, RunState } from '@daily-delve/shared';
import { describe, expect, it, vi } from 'vitest';
import { useGame } from './useGame.ts';
import type { GameEngine } from './useGame.ts';

/** A fake engine: endTurn takes 1 HP, and anything else is refused. */
function fakeEngine(): GameEngine {
  return {
    start: vi.fn((seed: string) => ({ seed, hp: 10 }) as unknown as RunState),
    applyAction: vi.fn((state: RunState, action: Action): ApplyResult => {
      if (action.type === 'endTurn') return { ok: true, state: { ...state, hp: state.hp - 1 } };
      return { ok: false, error: { code: 'ILLEGAL_ACTION', message: 'Not in this fake' } };
    }),
  };
}

describe('useGame', () => {
  it('starts from the engine with no actions and no error', () => {
    const engine = fakeEngine();
    const { result } = renderHook(() => useGame('seed-1', engine));
    expect(result.current).toMatchObject({ seed: 'seed-1', actions: [], error: null });
    expect(result.current.state.hp).toBe(10);
    expect(engine.start).toHaveBeenCalledWith('seed-1');
  });

  it('appends an accepted action and takes the state the engine returns', () => {
    const engine = fakeEngine();
    const { result } = renderHook(() => useGame('seed-1', engine));
    const before = result.current.state;
    act(() => result.current.dispatch({ type: 'endTurn' }));
    expect(engine.applyAction).toHaveBeenCalledWith(before, { type: 'endTurn' });
    expect(result.current.actions).toEqual([{ type: 'endTurn' }]);
    expect(result.current.state.hp).toBe(9);
    expect(result.current.error).toBeNull();
  });

  it('reports a refused action and changes nothing else', () => {
    const engine = fakeEngine();
    const { result } = renderHook(() => useGame('seed-1', engine));
    act(() => result.current.dispatch({ type: 'endTurn' }));
    const { state, actions } = result.current;
    act(() => result.current.dispatch({ type: 'playCard', handIndex: 9 }));
    expect(result.current.error).toEqual({ code: 'ILLEGAL_ACTION', message: 'Not in this fake' });
    expect(result.current.state).toBe(state);
    expect(result.current.actions).toBe(actions);
    expect(result.current.seed).toBe('seed-1');
  });

  it('clears the error once an action is accepted again', () => {
    const { result } = renderHook(() => useGame('seed-1', fakeEngine()));
    act(() => result.current.dispatch({ type: 'playCard', handIndex: 0 }));
    expect(result.current.error).not.toBeNull();
    act(() => result.current.dispatch({ type: 'endTurn' }));
    expect(result.current.error).toBeNull();
  });

  it('restarts on a new seed with no actions', () => {
    const engine = fakeEngine();
    const { result } = renderHook(() => useGame('seed-1', engine));
    act(() => result.current.dispatch({ type: 'endTurn' }));
    act(() => result.current.restart('seed-2'));
    expect(result.current).toMatchObject({ seed: 'seed-2', actions: [], error: null });
    expect(result.current.state.hp).toBe(10);
    expect(engine.start).toHaveBeenLastCalledWith('seed-2');
  });
});
