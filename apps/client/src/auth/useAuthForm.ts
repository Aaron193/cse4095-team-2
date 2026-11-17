// Form state shared by the login and register screens (task P1-D3): the values, each field's
// error, the form's own error, and whether it is sending.
//
// - A field is checked when the player leaves it with something typed, and on submit.
// - A field showing an error is checked again as it changes, so the error clears once fixed.
// - Submit checks every field first and sends nothing while any fails.
// - Server errors go beside the fields they name, or onto the form. Focus moves to the first
//   field with an error, and back to the submit button if it had been lost.
import { useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent, FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { AUTH_MESSAGES, describeAuthError } from './validation.ts';
import type { AuthField } from './validation.ts';

interface AuthFormOptions<F extends AuthField> {
  /** The form's fields, top to bottom. */
  fields: readonly F[];
  /** The browser-side check of one field: an error message, or null. */
  check: (field: F, value: string) => string | null;
  /** Sends the form. A rejection is shown on the form. */
  send: (values: Record<F, string>) => Promise<void>;
}

export function useAuthForm<F extends AuthField>({ fields, check, send }: AuthFormOptions<F>) {
  const [values, setValues] = useState(
    () => Object.fromEntries(fields.map((name) => [name, ''])) as Record<F, string>,
  );
  const [errors, setErrors] = useState<Partial<Record<F, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputs = useRef<Partial<Record<F, HTMLInputElement | null>>>({});
  const submitRef = useRef<HTMLButtonElement>(null);

  function setFieldError(name: F, error: string | null) {
    setErrors((current) => {
      if ((current[name] ?? null) === error) return current;
      const next = { ...current };
      if (error) next[name] = error;
      else delete next[name];
      return next;
    });
  }

  function focusFirstError(found: Partial<Record<F, string>>): boolean {
    const first = fields.find((name) => found[name]);
    if (first === undefined) return false;
    inputs.current[first]?.focus();
    return true;
  }

  /** Props for the TextField or PasswordField of one field. */
  function field(name: F) {
    return {
      name,
      value: values[name],
      error: errors[name] ?? null,
      ref: (element: HTMLInputElement | null) => {
        inputs.current[name] = element;
      },
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        setValues((current) => ({ ...current, [name]: value }));
        if (errors[name]) setFieldError(name, check(name, value));
      },
      onBlur: (event: FocusEvent<HTMLInputElement>) => {
        const { value } = event.target;
        // Only adds an error: a server error stays until the field changes.
        const error = value === '' ? null : check(name, value);
        if (error) setFieldError(name, error);
      },
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const found: Partial<Record<F, string>> = {};
    for (const name of fields) {
      const error = check(name, values[name]);
      if (error) found[name] = error;
    }
    setErrors(found);
    setFormError(null);
    if (focusFirstError(found)) return;

    setPending(true);
    try {
      await send(values);
    } catch (error) {
      const text = describeAuthError(error);
      const placed: Partial<Record<F, string>> = {};
      let message = text.form;
      for (const [name, fieldMessage] of Object.entries(text.fields)) {
        if (fields.includes(name as F)) placed[name as F] = fieldMessage;
        else message ??= AUTH_MESSAGES.rejected;
      }
      // Render now, so the submit button is enabled again before focus moves.
      flushSync(() => {
        setErrors(placed);
        setFormError(message);
        setPending(false);
      });
      if (!focusFirstError(placed) && document.activeElement === document.body) {
        submitRef.current?.focus();
      }
    }
  }

  return { field, onSubmit, pending, formError, submitRef };
}
