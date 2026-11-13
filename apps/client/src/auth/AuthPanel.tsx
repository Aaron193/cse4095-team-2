// The frame of the login and register screens (task P1-D3): a gold-trimmed panel, centered on
// a torch-lit backdrop. The backdrop is `.auth-screen`; an illustration can be added behind it.
import { useId } from 'react';
import type { ReactNode } from 'react';
import { Ornament } from '../components/ui/Ornament.tsx';
import './AuthPanel.css';

interface AuthPanelProps {
  title: string;
  subtitle: string;
  /** The form. */
  children: ReactNode;
  /** Under the form: the link to the other screen. */
  footer: ReactNode;
}

const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

/** Gold flourishes in the panel's corners, like the card frame's. */
function PanelCorners() {
  return CORNERS.map((corner) => (
    <svg
      key={corner}
      className={`auth-panel__corner auth-panel__corner--${corner}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1.5 18V7.5Q1.5 1.5 7.5 1.5H18" />
      <path d="M6 13.5Q6 6 13.5 6" />
      <circle cx="9.6" cy="9.6" r="1.3" />
    </svg>
  ));
}

export function AuthPanel({ title, subtitle, children, footer }: AuthPanelProps) {
  const titleId = useId();
  return (
    <div className="auth-screen">
      <div className="auth-screen__embers" aria-hidden="true" />
      <section className="auth-panel" aria-labelledby={titleId}>
        <PanelCorners />
        <header className="auth-panel__header">
          <Ornament className="auth-panel__ornament" />
          <h1 id={titleId} className="auth-panel__title">
            {title}
          </h1>
          <p className="auth-panel__subtitle">{subtitle}</p>
        </header>
        {children}
        <div className="auth-panel__rule" aria-hidden="true" />
        <footer className="auth-panel__footer">{footer}</footer>
      </section>
    </div>
  );
}

/** The form's own error, such as a wrong password. Read out as soon as it appears. */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div className="auth-form__alert" role="alert">
      <svg className="auth-form__alert-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.8 21.2 12 12 21.2 2.8 12Z" />
        <path className="auth-form__alert-mark" d="M12 7.6v5.6M12 16.2v.2" />
      </svg>
      <p className="auth-form__alert-text">{children}</p>
    </div>
  );
}
