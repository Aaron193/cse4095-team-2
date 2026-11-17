// The register screen (task P1-D3; Docs/screens.md, section 1): the login form plus an
// optional display name.
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.tsx';
import { AuthPanel, FormAlert } from '../auth/AuthPanel.tsx';
import { redirectTarget } from '../auth/redirect.ts';
import { useAuthForm } from '../auth/useAuthForm.ts';
import {
  DISPLAY_NAME_MAX,
  displayNameError,
  PASSWORD_MAX,
  PASSWORD_MIN,
  passwordError,
  registerRequest,
  USERNAME_MAX,
  USERNAME_MIN,
  usernameError,
} from '../auth/validation.ts';
import { Button } from '../components/ui/Button.tsx';
import { PasswordField } from '../components/ui/PasswordField.tsx';
import { TextField } from '../components/ui/TextField.tsx';
import { ROUTES } from '../routes.ts';

const FIELDS = ['username', 'displayName', 'password'] as const;

export function RegisterScreen() {
  const { user, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const destination = redirectTarget(location.state);

  const form = useAuthForm({
    fields: FIELDS,
    check: (name, value) => {
      if (name === 'username') return usernameError(value, 'register');
      if (name === 'password') return passwordError(value, 'register');
      return displayNameError(value);
    },
    send: async (values) => {
      await register(registerRequest(values));
      navigate(destination, { replace: true });
    },
  });

  // Already logged in: nothing to do here.
  if (user) return <Navigate to={destination} replace />;

  return (
    <AuthPanel
      title="Register"
      subtitle="Carve your name into today's leaderboard."
      footer={
        <p className="auth-switch">
          Have an account?{' '}
          <Link className="auth-switch__link" to={ROUTES.login} state={location.state}>
            Log in
          </Link>
        </p>
      }
    >
      <form className="auth-form" noValidate onSubmit={form.onSubmit}>
        <TextField
          label="Username"
          hint={`${USERNAME_MIN}–${USERNAME_MAX} letters, numbers, or _. You log in with it.`}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          {...form.field('username')}
        />
        <TextField
          label="Display name"
          optional
          hint={`Up to ${DISPLAY_NAME_MAX} characters, shown on the leaderboard. Your username if empty.`}
          autoComplete="nickname"
          {...form.field('displayName')}
        />
        <PasswordField
          label="Password"
          hint={`${PASSWORD_MIN}–${PASSWORD_MAX} characters.`}
          autoComplete="new-password"
          required
          {...form.field('password')}
        />
        {form.formError ? <FormAlert>{form.formError}</FormAlert> : null}
        <Button
          ref={form.submitRef}
          type="submit"
          variant="primary"
          size="lg"
          block
          loading={form.pending}
          className="auth-form__submit"
        >
          {form.pending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthPanel>
  );
}
