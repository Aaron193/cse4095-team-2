import { Link } from 'react-router';
import { ROUTES } from '../routes.ts';

export function NotFoundScreen() {
  return (
    <section className="placeholder">
      <h1>Page not found</h1>
      <p>
        <Link to={ROUTES.home}>Back to today&apos;s dungeon</Link>
      </p>
    </section>
  );
}
