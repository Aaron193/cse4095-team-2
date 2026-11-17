// A labeled text input (task P1-D3): a small-capitals label, a dark inset input, and one line
// under it for a hint or, in its place, an error. The input is described by that line and
// marked `aria-invalid` while it shows an error.
import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import './TextField.css';

export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'children'> {
  label: string;
  /** A short help line under the input, such as its limits. Hidden while there is an error. */
  hint?: ReactNode;
  /** An error under the input. */
  error?: string | null;
  /** Says "Optional" beside the label. */
  optional?: boolean;
  /** A control inside the right end of the input, such as a show-password button. */
  trailing?: ReactNode;
}

export function TextField({
  label,
  hint,
  error,
  optional = false,
  trailing,
  id,
  className,
  'aria-describedby': describedBy,
  ...input
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? `field${generatedId}`;
  const messageId = `${inputId}-message`;
  const message = error || hint;
  const describedByIds = [describedBy, message ? messageId : null].filter(Boolean).join(' ');

  const classes = ['field', error && 'field--invalid', trailing && 'field--trailing', className];
  return (
    <div className={classes.filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={inputId}>
        {label}
        {optional ? <span className="field__optional"> Optional</span> : null}
      </label>
      <div className="field__control">
        <input
          {...input}
          id={inputId}
          className="field__input"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByIds || undefined}
        />
        {trailing ? <div className="field__trailing">{trailing}</div> : null}
      </div>
      {error ? (
        <p id={messageId} className="field__message field__message--error">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="field__message">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
