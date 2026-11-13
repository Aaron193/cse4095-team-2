// Card combat (tasks P1-A2 to P1-A6; TODO.md, Reference R3 "Turn order in a fight").
//
// Every function here changes the working copy of the run state it is given. applyAction
// (run.ts) makes that copy before calling in, so a caller's state is never changed (R2 rule 6).
// The deck is shuffled, and the discard pile reshuffled, with the stream shuffle:<nodeId>,
// whose state lives in `combat.rng` (R2 rule 4).
import {
  addCapped,
  applyDamage,
  burnAfterTick,
  computeDamage,
  decayByOne,
  shatterDamage,
} from './calc.ts';
import {
  ENERGY_CAP,
  ENERGY_PER_TURN,
  FIGHT_TURN_CAP,
  HAND_SIZE,
  MAX_HAND,
  SHIELD_CAP,
  SHIELD_PERSISTS,
  STATUS_CAP,
} from './content/balance.ts';
import { cardDef, enemyDef } from './defs.ts';
import type { Defs } from './defs.ts';
import { notImplemented } from './notImplemented.ts';
import { createRng, shuffle } from './rng.ts';
import type {
  CardDef,
  CombatState,
  Effect,
  EnemyDef,
  EnemyState,
  EngineError,
  Intent,
  RunState,
  StatusId,
  Statuses,
} from './types.ts';

type DamageEffect = Extract<Effect, { kind: 'damage' }>;
type StatusEffect = Extract<Effect, { kind: 'applyStatus' }>;
type ShatterEffect = Extract<Effect, { kind: 'shatter' }>;

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

/** The intents an enemy cycles through: its phase 2 cycle once it has entered phase 2. */
export function intentCycle(enemy: EnemyState, def: EnemyDef): Intent[] {
  const intents = enemy.phase === 2 && def.phase2 ? def.phase2.intents : def.intents;
  if (intents.length === 0) throw new Error(`Enemy "${def.id}" has no intents`);
  return intents;
}

/** The intent an enemy is showing. `intentIndex` always stays inside its cycle. */
export function currentIntent(enemy: EnemyState, def: EnemyDef): Intent {
  const intents = intentCycle(enemy, def);
  return intents[enemy.intentIndex % intents.length] as Intent;
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

export function illegal(message: string): EngineError {
  return { code: 'ILLEGAL_ACTION', message };
}

/** True for an integer index into a list of `length` items. Actions come from outside. */
export function isIndex(value: unknown, length: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < length;
}

/** A card needs an enemy target when any of its effects is aimed at one enemy. */
export function needsTarget(card: CardDef): boolean {
  return card.effects.some(
    (effect) =>
      effect.kind === 'shatter' ||
      ((effect.kind === 'damage' || effect.kind === 'applyStatus') && effect.target === 'enemy'),
  );
}

export function allEnemiesDefeated(combat: CombatState): boolean {
  return combat.enemies.every((enemy) => enemy.hp <= 0);
}

/**
 * Plays the card at `handIndex`, aimed at the enemy at `target` if it needs one.
 *
 * Refused when the index is not a card in the hand, the card costs more than the current
 * energy, or the target is missing, out of range, or already defeated (and when a target is
 * given to a card that takes none, so every legal play has exactly one form). A refused play
 * returns its reason before anything changes.
 *
 * A legal play leaves the hand, pays its cost, resolves its effects in the listed order, and
 * goes to the discard pile. The fight is won the moment the last enemy reaches 0 HP; any
 * effects after that do not resolve.
 */
export function playCard(
  state: RunState,
  handIndex: unknown,
  target: unknown,
  defs: Defs,
): EngineError | null {
  const combat = activeCombat(state);
  if (!isIndex(handIndex, combat.hand.length)) {
    return illegal(`There is no card at hand index ${String(handIndex)}`);
  }
  const cardId = combat.hand[handIndex] as string;
  const card = cardDef(defs, cardId);
  if (card.cost > combat.energy) {
    return illegal(`${card.name} costs ${card.cost} energy and only ${combat.energy} is left`);
  }
  let aim: number | null = null;
  if (needsTarget(card)) {
    if (target === undefined) return illegal(`${card.name} needs a target`);
    if (!isIndex(target, combat.enemies.length)) {
      return illegal(`There is no enemy at index ${String(target)}`);
    }
    if ((combat.enemies[target] as EnemyState).hp <= 0) {
      return illegal('That enemy is already defeated');
    }
    aim = target;
  } else if (target !== undefined) {
    return illegal(`${card.name} does not take a target`);
  }

  combat.hand.splice(handIndex, 1);
  combat.energy -= card.cost;
  for (const effect of card.effects) {
    resolveEffect(state, effect, aim);
    if (state.phase !== 'combat') return null;
  }
  // R3, Tag synergy: a card counts toward the cards played after it this turn, not itself.
  for (const tag of card.tags) combat.tagsPlayedThisTurn[tag] += 1;
  (card.exhaust ? combat.exhaustPile : combat.discardPile).push(cardId);
  return null;
}

/** Resolves one effect of a played card. `aim` is the chosen enemy, or null. */
function resolveEffect(state: RunState, effect: Effect, aim: number | null): void {
  const combat = activeCombat(state);
  switch (effect.kind) {
    case 'damage':
      dealCardDamage(state, effect, aim);
      return;
    case 'shield':
      combat.player.shield = addCapped(combat.player.shield, effect.amount, SHIELD_CAP);
      return;
    case 'draw':
      drawCards(combat, effect.count);
      return;
    case 'energy':
      combat.energy = addCapped(combat.energy, effect.amount, ENERGY_CAP);
      return;
    case 'applyStatus':
      applyStatusEffect(state, effect, aim);
      return;
    case 'shatter':
      shatterTarget(state, effect, aim);
      return;
    case 'power':
      return notImplemented('effect power', 'P3-A1');
  }
}

/**
 * The `perTagPlayed` bonus a damage effect would add to each hit now: `bonus` for each card
 * with its tag played earlier this turn (R3, Tag synergy).
 */
export function tagBonus(combat: CombatState, effect: DamageEffect): number {
  const synergy = effect.perTagPlayed;
  return synergy ? synergy.bonus * combat.tagsPlayedThisTurn[synergy.tag] : 0;
}

/**
 * A damage effect: every hit goes through computeDamage (the tag bonus, then minus the
 * player's Chill), then Shield, then HP. A tag bonus above 0 is one combo trigger for the
 * effect, however many hits or enemies it reaches (R3, Score).
 */
function dealCardDamage(state: RunState, effect: DamageEffect, aim: number | null): void {
  const combat = activeCombat(state);
  const bonus = tagBonus(combat, effect);
  if (bonus > 0) state.stats.comboTriggers += 1;
  const amount = computeDamage({
    base: effect.amount,
    add: [bonus, -combat.player.statuses.Chill],
  });
  const hits = effect.hits ?? 1;
  for (let hit = 0; hit < hits; hit++) {
    for (let index = 0; index < combat.enemies.length; index++) {
      if (effect.target === 'enemy' && index !== aim) continue;
      const enemy = combat.enemies[index] as EnemyState;
      if (enemy.hp <= 0) continue;
      hitEnemy(state, enemy, amount, false);
      if (state.phase !== 'combat') return;
    }
  }
}

/** Damage to one enemy: Shield first unless `ignoreShield`. The last enemy down wins the fight. */
function hitEnemy(state: RunState, enemy: EnemyState, amount: number, ignoreShield: boolean): void {
  const result = applyDamage(enemy, amount, { ignoreShield });
  enemy.hp = result.hp;
  enemy.shield = result.shield;
  if (allEnemiesDefeated(activeCombat(state))) winFight(state);
}

function addStatus(statuses: Statuses, status: StatusId, amount: number): void {
  statuses[status] = addCapped(statuses[status], amount, STATUS_CAP);
}

/** applyStatus: on the chosen enemy, on every living enemy, or on the player. */
function applyStatusEffect(state: RunState, effect: StatusEffect, aim: number | null): void {
  const combat = activeCombat(state);
  if (effect.target === 'self') {
    addStatus(combat.player.statuses, effect.status, effect.amount);
    return;
  }
  combat.enemies.forEach((enemy, index) => {
    if (enemy.hp <= 0 || (effect.target === 'enemy' && index !== aim)) return;
    addStatus(enemy.statuses, effect.status, effect.amount);
  });
}

/**
 * Shatter: removes all Chill from the chosen enemy and deals `perStack` damage for each stack
 * removed, as one hit that Shield absorbs. It is not an attack hit, so the player's own Chill
 * does not reduce it. With no Chill to remove it does nothing; removing any is a combo trigger.
 */
function shatterTarget(state: RunState, effect: ShatterEffect, aim: number | null): void {
  const enemy = aim === null ? undefined : activeCombat(state).enemies[aim];
  if (!enemy || enemy.hp <= 0 || enemy.statuses.Chill === 0) return;
  const stacks = enemy.statuses.Chill;
  enemy.statuses.Chill = 0;
  state.stats.comboTriggers += 1;
  hitEnemy(state, enemy, shatterDamage(effect.perStack, stacks), false);
}

/**
 * The fight is won. Its site is cleared. Winning the boss fight wins the run, and
 * `nodesCleared` becomes the number of sites (R3, Dungeon). Any other fight returns to the map
 * (task P2-A4 puts the reward screen in between). The final board stays in `combat` for a
 * won run, so the end of the fight can still be drawn.
 */
export function winFight(state: RunState): void {
  const combat = activeCombat(state);
  const node = state.dungeon.nodes.find((candidate) => candidate.id === combat.nodeId);
  state.cleared.push(combat.nodeId);
  if (node?.type === 'boss') {
    state.phase = 'ended';
    state.outcome = 'won';
    state.nodesCleared = state.dungeon.nodes.length;
    return;
  }
  state.nodesCleared += 1;
  state.phase = 'map';
  state.combat = null;
}

/** The run is lost. The final board stays in `combat` so the defeat can still be drawn. */
export function loseRun(state: RunState): void {
  state.phase = 'ended';
  state.outcome = 'lost';
}

/**
 * Ends the player's turn and plays out the rest of it, in R3's order:
 *   3. enemy phase: each living enemy, in index order, loses its Shield (unless
 *      SHIELD_PERSISTS) and carries out the intent it was showing;
 *   4. end of turn: the hand is discarded, statuses tick on the player and then on each
 *      enemy in index order, and every enemy shows its next intent;
 *   then the next turn starts (step 1), unless this was turn FIGHT_TURN_CAP, which loses.
 * The run is lost the moment the player reaches 0 HP.
 */
export function endTurn(state: RunState, defs: Defs): EngineError | null {
  const combat = activeCombat(state);

  for (const enemy of combat.enemies) {
    if (enemy.hp <= 0) continue;
    if (!SHIELD_PERSISTS) enemy.shield = 0;
    actOnIntent(state, enemy, currentIntent(enemy, enemyDef(defs, enemy.defId)));
    if (state.phase !== 'combat') return null;
  }

  combat.discardPile.push(...combat.hand);
  combat.hand = [];

  tickStatuses(state);
  if (state.phase !== 'combat') return null;

  for (const enemy of combat.enemies) {
    if (enemy.hp <= 0) continue;
    const cycle = intentCycle(enemy, enemyDef(defs, enemy.defId));
    enemy.intentIndex = (enemy.intentIndex + 1) % cycle.length;
  }

  if (combat.turn >= FIGHT_TURN_CAP) {
    loseRun(state);
    return null;
  }
  startTurn(state);
  return null;
}

/** One enemy carries out one intent. */
function actOnIntent(state: RunState, enemy: EnemyState, intent: Intent): void {
  const combat = activeCombat(state);
  switch (intent.kind) {
    case 'attack': {
      const amount = computeDamage({
        base: intent.damage,
        add: [enemy.strength, -enemy.statuses.Chill],
      });
      for (let hit = 0; hit < intent.hits; hit++) {
        hitPlayer(state, amount, false);
        if (state.phase !== 'combat') return;
      }
      return;
    }
    case 'block':
      enemy.shield = addCapped(enemy.shield, intent.amount, SHIELD_CAP);
      return;
    case 'buff':
      enemy.strength += intent.strength;
      return;
    case 'debuff':
      addStatus(combat.player.statuses, intent.status, intent.amount);
      return;
  }
}

/** Damage to the player: Shield first unless `ignoreShield`. At 0 HP the run is lost. */
function hitPlayer(state: RunState, amount: number, ignoreShield: boolean): void {
  const combat = activeCombat(state);
  const result = applyDamage({ hp: state.hp, shield: combat.player.shield }, amount, {
    ignoreShield,
  });
  state.hp = result.hp;
  combat.player.shield = result.shield;
  if (state.hp <= 0) loseRun(state);
}

/**
 * End-of-turn status ticks, on the player first and then on each living enemy in index order
 * (R3, Statuses). On each unit: Burn deals its stacks as damage that Shield absorbs, then
 * halves (rounded down); Poison takes its stacks from HP, ignoring Shield, then falls by 1;
 * Chill falls by 1. The run is lost the moment the player reaches 0 HP, and the fight is won
 * the moment the last enemy does.
 */
function tickStatuses(state: RunState): void {
  const combat = activeCombat(state);
  const mine = combat.player.statuses;
  if (mine.Burn > 0) {
    hitPlayer(state, mine.Burn, false);
    mine.Burn = burnAfterTick(mine.Burn);
    if (state.phase !== 'combat') return;
  }
  if (mine.Poison > 0) {
    hitPlayer(state, mine.Poison, true);
    mine.Poison = decayByOne(mine.Poison);
    if (state.phase !== 'combat') return;
  }
  mine.Chill = decayByOne(mine.Chill);

  for (const enemy of combat.enemies) {
    if (enemy.hp <= 0) continue;
    const theirs = enemy.statuses;
    if (theirs.Burn > 0) {
      hitEnemy(state, enemy, theirs.Burn, false);
      theirs.Burn = burnAfterTick(theirs.Burn);
      if (state.phase !== 'combat') return;
    }
    if (theirs.Poison > 0 && enemy.hp > 0) {
      hitEnemy(state, enemy, theirs.Poison, true);
      theirs.Poison = decayByOne(theirs.Poison);
      if (state.phase !== 'combat') return;
    }
    theirs.Chill = decayByOne(theirs.Chill);
  }
}
