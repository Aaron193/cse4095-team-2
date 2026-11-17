import { DeterminismCheck } from '../components/DeterminismCheck.tsx';
import { ButtonLink } from '../components/ui/ButtonLink.tsx';
import { ROUTES } from '../routes.ts';
import { Placeholder } from './Placeholder.tsx';

export function HomeScreen() {
  return (
    <Placeholder title="Today's Dungeon" task="P2-C8">
      <p>
        <ButtonLink to={ROUTES.testFight} variant="primary">
          Play the test fight
        </ButtonLink>
      </p>
      <DeterminismCheck />
    </Placeholder>
  );
}
