// A link to another screen that looks like a Button (task P1-D4), such as the header's Log in
// and Register. It is a router NavLink, so it says when it points at the current page.
import { NavLink } from 'react-router';
import type { NavLinkProps } from 'react-router';
import type { ReactNode } from 'react';
import { buttonClassName } from './Button.tsx';
import type { ButtonLookProps } from './Button.tsx';
import './Button.css';

export interface ButtonLinkProps
  extends Omit<NavLinkProps, 'className' | 'children' | 'style'>, ButtonLookProps {
  className?: string;
  children: ReactNode;
}

export function ButtonLink({
  variant,
  size,
  block,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <NavLink {...rest} className={buttonClassName({ variant, size, block }, className)}>
      <span className="btn__label">{children}</span>
    </NavLink>
  );
}
