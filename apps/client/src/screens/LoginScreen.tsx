// The login screen (task P1-D3; Docs/screens.md, section 1).
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.tsx';
import { AuthPanel, FormAlert } from '../auth/AuthPanel.tsx';
import { redirectTarget } from '../auth/redirect.ts';
import { useAuthForm } from '../auth/useAuthForm.ts';
import { passwordError, usernameError } from '../auth/validation.ts';
import { Button } from '../components/ui/Button.tsx';
import { PasswordField } from '../components/ui/PasswordField.tsx';
import { TextField } from '../components/ui/TextField.tsx';
import { ROUTES } from '../routes.ts';

const FIELDS = ['username', 'password'] as const;

export function LoginScreen() {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const destination = redirectTarget(location.state);

  const form = useAuthForm({
    fields: FIELDS,
    check: (name, value) =>
      name === 'username' ? usernameError(value, 'login') : passwordError(value, 'login'),
    send: async ({ username, password }) => {
      await login({ username: username.trim(), password });
      navigate(destination, { replace: true });
    },
  });

  // Already logged in: nothing to do here.
  if (user) return <Navigate to={destination} replace />;

  return (
    <AuthPanel
      title="Log in"
      subtitle="Every day, one dungeon. Everyone delves it."
      footer={
        <p className="auth-switch">
          No account?{' '}
          <Link className="auth-switch__link" to={ROUTES.register} state={location.state}>
            Register
          </Link>
        </p>
      }
    >
      <form className="auth-form" noValidate onSubmit={form.onSubmit}>
        <TextField
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          {...form.field('username')}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
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
          {form.pending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthPanel>
  );
}
