import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fixtureCombat } from '../game/fixtures/index.ts';
import { Enemy } from './Enemy.tsx';

const [archer, slime] = fixtureCombat().enemies;

describe('Enemy', () => {
  it('shows the name, HP, Shield, and the intent with its number', () => {
    render(<Enemy enemy={archer!} index={0} />);
    const enemy = screen.getByRole('region', { name: 'Bone Archer' });
    expect(within(enemy).getByRole('heading', { name: 'Bone Archer' })).toBeInTheDocument();
    expect(within(enemy).getByText('31 / 56')).toBeInTheDocument();
    expect(within(enemy).getByRole('meter', { name: 'Bone Archer HP' })).toHaveAttribute(
      'aria-valuenow',
      '31',
    );
    expect(within(enemy).getByLabelText('Shield 5')).toBeInTheDocument();
    expect(within(enemy).getByText('Attack 6')).toBeInTheDocument();
  });

  it('shows a badge for each status in the fixture, and strength', () => {
    render(<Enemy enemy={archer!} index={0} />);
    for (const badge of ['Burn 2', 'Chill 1', 'Poison 3', 'Strength 2']) {
      expect(screen.getByLabelText(badge)).toBeInTheDocument();
    }
  });

  it('draws no badge for a status at 0 and no Shield at 0', () => {
    render(<Enemy enemy={slime!} index={1} />);
    expect(screen.queryByRole('list', { name: 'Statuses' })).toBeNull();
    expect(screen.queryByLabelText(/^Shield/)).toBeNull();
    expect(screen.getByText('Block 10')).toBeInTheDocument();
  });

  it('names each kind of intent with its number', () => {
    const at = (intentIndex: number, enemy = archer!) => ({ ...enemy, intentIndex });
    const { rerender } = render(<Enemy enemy={at(2)} index={0} />);
    expect(screen.getByText('Attack 3 x3')).toBeInTheDocument();
    rerender(<Enemy enemy={at(1)} index={0} />);
    expect(screen.getByText('Strength +2')).toBeInTheDocument();
    rerender(<Enemy enemy={at(2, slime!)} index={1} />);
    expect(screen.getByText('Chill 3')).toBeInTheDocument();
  });

  it('is drawn defeated at 0 HP, with no intent and no way to target it', () => {
    render(<Enemy enemy={{ ...archer!, hp: 0 }} index={0} targetable={false} onTarget={vi.fn()} />);
    expect(screen.getByText('Defeated')).toBeInTheDocument();
    expect(screen.queryByText('Attack 6')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is a button that reports its index while it can be targeted', async () => {
    const onTarget = vi.fn();
    render(<Enemy enemy={slime!} index={1} targetable onTarget={onTarget} />);
    await userEvent.click(screen.getByRole('button', { name: 'Target Gel Slime' }));
    expect(onTarget).toHaveBeenCalledWith(1);
  });
});
