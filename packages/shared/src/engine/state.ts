// Copying a run state (R2 rule 6: applyAction copies the state, changes the copy, and returns it).
//
// The copy is deep for everything an action can change. `dungeon` is shared between the two
// states: it is fixed for the whole run (opened gates are kept in `openedGates`, not in the
// tiles), and no rule code ever writes to it. Tests deep-freeze their input states, so a
// write to the shared dungeon would throw.
import type { CombatState, RunState, Statuses } from './types.ts';

function copyStatuses(statuses: Statuses): Statuses {
  return { Burn: statuses.Burn, Chill: statuses.Chill, Poison: statuses.Poison };
}

function copyCombat(combat: CombatState): CombatState {
  return {
    nodeId: combat.nodeId,
    turn: combat.turn,
    energy: combat.energy,
    hand: combat.hand.slice(),
    drawPile: combat.drawPile.slice(),
    discardPile: combat.discardPile.slice(),
    exhaustPile: combat.exhaustPile.slice(),
    enemies: combat.enemies.map((enemy) => ({
      defId: enemy.defId,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      shield: enemy.shield,
      statuses: copyStatuses(enemy.statuses),
      strength: enemy.strength,
      intentIndex: enemy.intentIndex,
      phase: enemy.phase,
    })),
    // Power definitions are content and never change, so the list is copied, not each power.
    player: {
      shield: combat.player.shield,
      statuses: copyStatuses(combat.player.statuses),
      powers: combat.player.powers.slice(),
    },
    tagsPlayedThisTurn: {
      Fire: combat.tagsPlayedThisTurn.Fire,
      Frost: combat.tagsPlayedThisTurn.Frost,
      Poison: combat.tagsPlayedThisTurn.Poison,
    },
    rng: { a: combat.rng.a, b: combat.rng.b, c: combat.rng.c, d: combat.rng.d },
  };
}

/** A copy of `state` that rule code may change freely. */
export function cloneRun(state: RunState): RunState {
  return {
    engineVersion: state.engineVersion,
    seed: state.seed,
    phase: state.phase,
    outcome: state.outcome,
    dungeon: state.dungeon,
    pos: { x: state.pos.x, y: state.pos.y },
    cleared: state.cleared.slice(),
    openedGates: state.openedGates.slice(),
    nodesCleared: state.nodesCleared,
    hp: state.hp,
    maxHp: state.maxHp,
    deck: state.deck.slice(),
    combat: state.combat ? copyCombat(state.combat) : null,
    rewardOffers: state.rewardOffers ? state.rewardOffers.slice() : null,
    stats: {
      turns: state.stats.turns,
      comboTriggers: state.stats.comboTriggers,
      steps: state.stats.steps,
    },
  };
}
