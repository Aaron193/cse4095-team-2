// The app's button (task P1-D3), in the concept art's style: `primary` is the gold END TURN
// button, `secondary` a gold outline, `ghost` plain text that lights up on hover.
import type { ComponentPropsWithRef } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonLookProps {
  /** Default `secondary`. */
  variant?: ButtonVariant;
  /** Default `md`. */
  size?: ButtonSize;
  /** Stretches the button to the width of its container. */
  block?: boolean;
}

/** The classes for a button's look, for elements that are not a `<button>`, such as a link. */
export function buttonClassName(
  { variant = 'secondary', size = 'md', block = false }: ButtonLookProps = {},
  ...extra: (string | false | undefined)[]
): string {
  return ['btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', ...extra]
    .filter(Boolean)
    .join(' ');
}

export interface ButtonProps extends ComponentPropsWithRef<'button'>, ButtonLookProps {
  /** Shows a spinner and disables the button, for example while a form is sending. */
  loading?: boolean;
}

export function Button({
  variant,
  size,
  block,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={buttonClassName({ variant, size, block }, loading && 'btn--loading', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      <span className="btn__label">{children}</span>
    </button>
  );
}
