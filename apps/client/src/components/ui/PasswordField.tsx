// A password input with a button that shows or hides what was typed (task P1-D3).
import { useState } from 'react';
import { TextField } from './TextField.tsx';
import type { TextFieldProps } from './TextField.tsx';

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailing'>;

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg className="field__reveal-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
      {crossed ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className="field__reveal"
          aria-label="Show password"
          aria-pressed={visible}
          onClick={() => setVisible((shown) => !shown)}
        >
          <EyeIcon crossed={visible} />
        </button>
      }
    />
  );
}
