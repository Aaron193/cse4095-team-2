// Which illustration each card uses, by card id. A card with no entry here gets the
// placeholder art for its tag. To add a character, see Docs/card-template.md.
import type { ComponentType } from 'react';
import { BogWitchArt } from './BogWitchArt.tsx';
import { HalvardArt } from './HalvardArt.tsx';
import { KipArt } from './KipArt.tsx';
import type { ArtProps } from './kit.tsx';

export type { ArtProps } from './kit.tsx';

export const CARD_ART: Record<string, ComponentType<ArtProps>> = {
  kip: KipArt,
  halvard: HalvardArt,
  'bog-witch': BogWitchArt,
};
