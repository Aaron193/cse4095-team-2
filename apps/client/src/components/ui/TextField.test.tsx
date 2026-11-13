// The shared text field and password field (task P1-D3).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { PasswordField } from './PasswordField.tsx';
import { TextField } from './TextField.tsx';

describe('TextField', () => {
  it('labels its input and describes it with the hint', () => {
    render(<TextField label="Username" hint="3–20 letters, numbers, or _." />);
    const input = screen.getByRole('textbox', { name: 'Username' });
    expect(input).toHaveAccessibleDescription('3–20 letters, numbers, or _.');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('shows an error in place of the hint and marks the input invalid', () => {
    render(<TextField label="Username" hint="3–20 letters." error="That username is taken." />);
    const input = screen.getByRole('textbox', { name: 'Username' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('That username is taken.');
    expect(screen.queryByText('3–20 letters.')).not.toBeInTheDocument();
  });

  it('has no description without a hint or an error', () => {
    render(<TextField label="Username" error={null} />);
    expect(screen.getByRole('textbox', { name: 'Username' })).not.toHaveAccessibleDescription();
  });

  it('keeps a description it is given', () => {
    render(
      <>
        <p id="rules">Shown to everyone.</p>
        <TextField label="Display name" aria-describedby="rules" hint="Up to 24 characters." />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Display name' })).toHaveAccessibleDescription(
      'Shown to everyone. Up to 24 characters.',
    );
  });

  it('says when it is optional', () => {
    render(<TextField label="Display name" optional />);
    expect(screen.getByRole('textbox', { name: 'Display name Optional' })).toBeInTheDocument();
  });

  it('passes the id, ref, and input props to the input', async () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextField label="Username" id="who" ref={ref} autoComplete="username" required />);
    const input = screen.getByRole('textbox', { name: 'Username' });
    expect(input).toHaveAttribute('id', 'who');
    expect(input).toHaveAttribute('autocomplete', 'username');
    expect(input).toBeRequired();
    expect(ref.current).toBe(input);

    await userEvent.setup().type(input, 'delver');
    expect(input).toHaveValue('delver');
  });
});

describe('PasswordField', () => {
  it('hides the password until the player asks to see it', async () => {
    render(<PasswordField label="Password" defaultValue="hunter22" />);
    const input = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    const user = userEvent.setup();
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not submit the form when the toggle is pressed', () => {
    render(
      <form>
        <PasswordField label="Password" />
      </form>,
    );
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('type', 'button');
  });
});
