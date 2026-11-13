// Painted card illustrations, by card id (see Docs/card-template.md, "Painted characters").
// A card drawn as an SVG scene in CARD_ART uses that scene; the cards listed here use a
// painting instead, made with an image model from a reference render of KipArt so the set
// keeps one look. Each is a 640 by 960 WebP, placed full bleed in the art window.
import brotherAsh from '../../assets/cards/brother-ash.webp';
import bryn from '../../assets/cards/bryn.webp';
import nix from '../../assets/cards/nix.webp';
import pyra from '../../assets/cards/pyra.webp';
import rook from '../../assets/cards/rook.webp';
import sera from '../../assets/cards/sera.webp';
import vex from '../../assets/cards/vex.webp';

export const CARD_PAINTINGS: Record<string, string> = {
  'brother-ash': brotherAsh,
  bryn,
  nix,
  pyra,
  rook,
  sera,
  vex,
};
