// Card combat (tasks P1-A2 to P1-A6; TODO.md, Reference R3 "Turn order in a fight").
//
// Every function here changes the working copy of the run state it is given. applyAction
// (run.ts) makes that copy before calling in, so a caller's state is never changed (R2 rule 6).
// The deck is shuffled, and the discard pile reshuffled, with the stream shuffle:<nodeId>,
// whose state lives in `combat.rng` (R2 rule 4).
import { ENERGY_PER_TURN, HAND_SIZE, MAX_HAND, SHIELD_PERSISTS } from './content/balance.ts';
import { enemyDef } from './defs.ts';
import type { Defs } from './defs.ts';
import { createRng, shuffle } from './rng.ts';
import type { CombatState, EnemyDef, EnemyState, Intent, RunState, Statuses } from './types.ts';

/** The stream that shuffles the deck in the fight at `nodeId`. */
export function shuffleStream(nodeId: string): string {
  return `shuffle:${nodeId}`;
}

export function noStatuses(): Statuses {
  return { Burn: 0, Chill: 0, Poison: 0 };
}

/** A fresh enemy from its definition: full HP, no Shield or statuses, showing its first intent. */
export function createEnemy(def: EnemyDef): EnemyState {
  return {
    defId: def.id,
    hp: def.maxHp,
    maxHp: def.maxHp,
    shield: 0,
    statuses: noStatuses(),
    strength: 0,
    intentIndex: 0,
    phase: 1,
  };
}

/** The intent an enemy is showing: from its phase 2 cycle once it has entered phase 2. */
export function currentIntent(enemy: EnemyState, def: EnemyDef): Intent {
  const intents = enemy.phase === 2 && def.phase2 ? def.phase2.intents : def.intents;
  const intent = intents[enemy.intentIndex % intents.length];
  if (!intent) throw new Error(`Enemy "${def.id}" has no intents`);
  return intent;
}

/**
 * Starts the fight at `nodeId`: builds its enemies from their definitions, shuffles the deck
 * into the draw pile, and starts turn 1.
 */
export function startCombat(state: RunState, nodeId: string, defs: Defs): void {
  const rng = createRng(state.seed, shuffleStream(nodeId));
  const enemyIds = state.dungeon.encounters[nodeId] ?? [];
  if (enemyIds.length === 0) throw new Error(`Node "${nodeId}" has no encounter`);

  state.phase = 'combat';
  state.combat = {
    nodeId,
    turn: 0,
    energy: 0,
    hand: [],
    drawPile: shuffle(rng, state.deck),
    discardPile: [],
    exhaustPile: [],
    enemies: enemyIds.map((id) => createEnemy(enemyDef(defs, id))),
    player: { shield: 0, statuses: noStatuses(), powers: [] },
    tagsPlayedThisTurn: { Fire: 0, Frost: 0, Poison: 0 },
    rng,
  };
  startTurn(state);
}

/**
 * Step 1 of R3's turn order: the player's Shield expires, the player draws HAND_SIZE cards
 * (up to MAX_HAND), energy is set to ENERGY_PER_TURN, and the tag counts reset.
 */
export function startTurn(state: RunState): void {
  const combat = activeCombat(state);
  combat.turn += 1;
  state.stats.turns += 1;
  if (!SHIELD_PERSISTS) combat.player.shield = 0;
  drawCards(combat, HAND_SIZE);
  combat.energy = ENERGY_PER_TURN;
  combat.tagsPlayedThisTurn = { Fire: 0, Frost: 0, Poison: 0 };
}

/**
 * Draws up to `count` cards from the top of the draw pile (index 0), stopping when the hand
 * holds MAX_HAND. An empty draw pile is refilled by shuffling the discard pile into it; when
 * both are empty, drawing stops. Returns how many cards were drawn.
 */
export function drawCards(combat: CombatState, count: number): number {
  let drawn = 0;
  while (drawn < count && combat.hand.length < MAX_HAND) {
    if (combat.drawPile.length === 0) {
      if (combat.discardPile.length === 0) break;
      combat.drawPile = shuffle(combat.rng, combat.discardPile);
      combat.discardPile = [];
    }
    const card = combat.drawPile.shift();
    if (card === undefined) break;
    combat.hand.push(card);
    drawn++;
  }
  return drawn;
}

/** The fight in progress. Rule code only calls this while the phase is 'combat'. */
export function activeCombat(state: RunState): CombatState {
  if (!state.combat) throw new Error('No fight is in progress');
  return state.combat;
}
