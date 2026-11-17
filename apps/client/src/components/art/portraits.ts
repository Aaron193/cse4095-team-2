// Painted figures for the combat screen: each enemy by id, and the player's Delver. Each is
// a WebP with a transparent background, trimmed to the figure. Enemies face left, toward
// the player; the Delver faces right.
import boneArcher from '../../assets/enemies/bone-archer.webp';
import gelSlime from '../../assets/enemies/gel-slime.webp';
import delver from '../../assets/delver.webp';

export const ENEMY_PORTRAITS: Record<string, string> = {
  'bone-archer': boneArcher,
  'gel-slime': gelSlime,
};

export const DELVER_PORTRAIT: string = delver;
