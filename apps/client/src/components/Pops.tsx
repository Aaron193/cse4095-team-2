// Floating numbers over a unit when its HP or Shield changes: "-6" for damage, "+5" for
// Shield gained. They only follow the state the engine produced; nothing waits for them.
import { useEffect, useRef, useState } from 'react';
import './Pops.css';

export interface Pop {
  id: number;
  text: string;
  kind: 'damage' | 'heal' | 'shield';
}

/** How long a number stays on screen. Matches the animation in Pops.css. */
const POP_MS = 1100;

/**
 * Watches `hp` and `shield` and returns the numbers to show, plus how many times HP has
 * fallen (a key that restarts a hit animation).
 */
export function usePops(hp: number, shield: number): { pops: Pop[]; hits: number } {
  const [pops, setPops] = useState<Pop[]>([]);
  const [hits, setHits] = useState(0);
  const last = useRef({ hp, shield });
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const before = last.current;
    last.current = { hp, shield };
    const added: Pop[] = [];
    if (hp < before.hp)
      added.push({ id: nextId.current++, text: `-${before.hp - hp}`, kind: 'damage' });
    if (hp > before.hp)
      added.push({ id: nextId.current++, text: `+${hp - before.hp}`, kind: 'heal' });
    if (shield > before.shield) {
      added.push({ id: nextId.current++, text: `+${shield - before.shield}`, kind: 'shield' });
    }
    if (added.length === 0) return;
    if (hp < before.hp) setHits((count) => count + 1);
    setPops((list) => [...list, ...added]);
    const ids = new Set(added.map((pop) => pop.id));
    timers.current.push(
      window.setTimeout(() => setPops((list) => list.filter((pop) => !ids.has(pop.id))), POP_MS),
    );
  }, [hp, shield]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return { pops, hits };
}

export function Pops({ pops }: { pops: readonly Pop[] }) {
  return (
    <div className="pops" aria-hidden="true">
      {pops.map((pop, i) => (
        <span
          key={pop.id}
          className={`pop pop--${pop.kind}`}
          style={{ animationDelay: `${(i % 3) * 60}ms` }}
        >
          {pop.text}
        </span>
      ))}
    </div>
  );
}
