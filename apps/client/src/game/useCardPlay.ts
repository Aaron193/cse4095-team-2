// Playing cards with the mouse (task P1-C4; Docs/screens.md, Combat). Which cards can be
// played, and on whom, comes from legalActions: a card with no legal action is disabled, a
// card whose actions carry targets waits for an enemy to be clicked, and any other card plays
// on the first click.
import { useCallback, useMemo, useState } from 'react';
import type { Action } from '@daily-delve/shared';

export interface CardPlay {
  handIndex: number;
  /** The enemies it can be aimed at, or null when it is played without a target. */
  targets: number[] | null;
}

/** The playable cards, by hand index, from a list of legal actions. */
export function cardPlays(actions: readonly Action[]): Map<number, CardPlay> {
  const plays = new Map<number, CardPlay>();
  for (const action of actions) {
    if (action.type !== 'playCard') continue;
    const play = plays.get(action.handIndex) ?? { handIndex: action.handIndex, targets: null };
    if (action.target !== undefined) play.targets = [...(play.targets ?? []), action.target];
    plays.set(action.handIndex, play);
  }
  return plays;
}

export interface CardPlayControls {
  plays: ReadonlyMap<number, CardPlay>;
  /** The hand index of the card waiting for a target, or null. */
  selected: number | null;
  /** The enemies the selected card can be aimed at; empty when nothing is selected. */
  targets: readonly number[];
  clickCard: (handIndex: number) => void;
  clickEnemy: (enemyIndex: number) => void;
  cancel: () => void;
}

/**
 * Selection state for the hand. `actions` must be a new array whenever the game state
 * changes (legalActions returns one), so a selection never outlives the state it was made in.
 */
export function useCardPlay(
  actions: readonly Action[],
  dispatch: (action: Action) => void,
): CardPlayControls {
  const plays = useMemo(() => cardPlays(actions), [actions]);
  const [selection, setSelection] = useState<{ index: number; actions: readonly Action[] } | null>(
    null,
  );
  const selected =
    selection && selection.actions === actions && plays.get(selection.index)?.targets
      ? selection.index
      : null;
  const targets = selected === null ? [] : (plays.get(selected)?.targets ?? []);

  const clickCard = useCallback(
    (handIndex: number) => {
      const play = plays.get(handIndex);
      if (!play) return;
      if (play.targets === null) {
        setSelection(null);
        dispatch({ type: 'playCard', handIndex });
        return;
      }
      setSelection(selected === handIndex ? null : { index: handIndex, actions });
    },
    [plays, selected, actions, dispatch],
  );

  const clickEnemy = useCallback(
    (enemyIndex: number) => {
      if (selected === null || !targets.includes(enemyIndex)) return;
      setSelection(null);
      dispatch({ type: 'playCard', handIndex: selected, target: enemyIndex });
    },
    [selected, targets, dispatch],
  );

  const cancel = useCallback(() => setSelection(null), []);

  return { plays, selected, targets, clickCard, clickEnemy, cancel };
}
