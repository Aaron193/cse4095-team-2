import { ButtonLink } from '../components/ui/ButtonLink.tsx';
import { ROUTES } from '../routes.ts';
import { Placeholder } from './Placeholder.tsx';

export function PlayScreen() {
  return (
    <Placeholder title="Play" task="P2-C3">
      <ButtonLink to={ROUTES.testFight} variant="primary">
        Play the test fight
      </ButtonLink>
    </Placeholder>
  );
}
