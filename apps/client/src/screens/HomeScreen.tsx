import { DeterminismCheck } from '../components/DeterminismCheck.tsx';
import { Placeholder } from './Placeholder.tsx';

export function HomeScreen() {
  return (
    <Placeholder title="Today's Dungeon" task="P2-C8">
      <DeterminismCheck />
    </Placeholder>
  );
}
