# Daily Delve card template (v3: in-app)

Every card is drawn by one React component, `apps/client/src/components/Card.tsx`, as a single
inline SVG in a **1000×1400** box. There is no build step: the frame and text are SVG and
CSS only, the card scales to any size through `--card-width`, and it draws the same in every
browser. The art is an SVG scene or, for some characters, a painting (see
[Painted characters](#painted-characters)).

v2 of this template rendered each card to a PNG with `build.py` and `render.py`. The frame
geometry, palette, typefaces, and lighting recipe below are the same as v2; what changed is
that they now live in the client, and that the PNG-only post-processing (bloom, film grain,
paper texture) is gone.

```
npm install
npm run dev -w apps/client     # the Card component is used wherever a card is shown
npm test -w apps/client        # Card.test.tsx and art/art.test.tsx
```

## Where things are

| File                               | What it holds                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/components/Card.tsx`          | The frame, the text, and the choice of art for a `CardDef`                                                          |
| `src/components/Card.css`          | Every size and color of the frame and text, in template units                                                       |
| `src/components/art/kit.tsx`       | The lighting recipe (`LitScene`) and shared scenery (`BrickWall`, `Cobbles`, `NightArch`, `Flame`, `Embers`, `Eye`) |
| `src/components/art/<Name>Art.tsx` | One character's illustration                                                                                        |
| `src/components/art/index.ts`      | `CARD_ART`: which illustration each card id uses                                                                    |
| `src/components/art/paintings.ts`  | `CARD_PAINTINGS`: which painting each card id uses, for cards with no SVG scene                                     |
| `src/assets/cards/<id>.webp`       | The paintings, 640×960 WebP                                                                                         |
| `src/styles/tokens.css`            | The palette, typefaces, and `--card-width`                                                                          |
| `src/styles/fonts.css`             | Cinzel, Cinzel Decorative, and Crimson Pro, bundled from npm                                                        |

## Layers (one SVG, 1000×1400 viewBox, back to front)

| Layer | Contents                                                                                |
| ----- | --------------------------------------------------------------------------------------- |
| Art   | A full-bleed character scene, edge to edge, clipped to the art window. Then a vignette. |
| Frame | Gold trim, corner ornaments, name banner, cost gem, rules panel, type ribbon, HP heart  |
| Text  | All lettering, as real text (selectable, readable by screen readers)                    |

## Frame geometry (px, 1000×1400)

| Element          | Position                                            | Notes                                                                                       |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Card body        | full card, r=40                                     | `--color-ink`; art window at x26 y26 w948 h1348 r26                                         |
| Gold trim        | rect x21 y21 w958 h1358 r30, 9px                    | gold gradient; a 2px tag-color line inside it                                               |
| Corner ornaments | the 4 corners                                       | `Corner`, mirrored into each corner                                                         |
| Cost gem         | center (102,102), r74                               | hex gem in the tag color; number: Cinzel 900, 80px                                          |
| Name banner      | x172–942, y36–136                                   | name: Cinzel Decorative 900, up to 56px, gold gradient; title: Crimson Pro 600 italic, 31px |
| Type ribbon      | x232–768, y960–1020 (swallow tails out to x190/810) | tag color; Cinzel 700, 28px; the tag word is gold                                           |
| Rules panel      | x62–938, y1004–1352                                 | translucent ink (72–94%) so the ground shows through; gold border                           |
| Rules text       | centered in the panel                               | Crimson Pro 600, 50px; numbers 700 gold; keywords 700 in their element's color              |
| Divider          | y1218                                               | gold lines and a tag-color diamond. Drawn only with flavor text.                            |
| Flavor           | baseline y1276                                      | Crimson Pro italic, 31px. Optional.                                                         |
| HP heart         | center (888,1281)                                   | gold-rimmed red heart; number Cinzel 900; small "HP" label. Optional.                       |

**Safe area for art:** keep the character's feet above y≈930 and the important art inside
x60–940, y150–950. Anything lower sits behind the ribbon or the rules panel; anything higher
sits behind the name banner and the cost gem.

**Palette** (`tokens.css`): ink `#161427 #221F38 #2A2547`, gold `#E8A33D #FFE07A`,
text `#F4EFE6`, and one bright and one deep color per tag:

| Tag    | Bright    | Deep      | Class on the card |
| ------ | --------- | --------- | ----------------- |
| Fire   | `#F59A2C` | `#E8572A` | `card--fire`      |
| Frost  | `#7FD3F0` | `#3A8FD0` | `card--frost`     |
| Poison | `#9BD64A` | `#4E8A2A` | `card--poison`    |

The ribbon, the gem, the trim line, and keyword text all read the card's tag class, so nothing
is recolored by hand. A card with two tags takes its accent from the first.

## What the card reads from a `CardDef`

| Field                    | Where it appears                                                                                                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                   | The banner. `"Kip, the Matchstick Kid"` is split at the comma into the name **KIP** and the title _the Matchstick Kid_. A name with no comma is drawn on its own, and long names shrink to fit.                                                      |
| `cost`                   | The gem                                                                                                                                                                                                                                              |
| `type`, `tags`, `rarity` | The ribbon: `ATTACK · FIRE · COMMON`                                                                                                                                                                                                                 |
| `tags[0]`                | The accent color                                                                                                                                                                                                                                     |
| `rarity: 'rare'`         | A gold glow around the card                                                                                                                                                                                                                          |
| `text`                   | The rules panel. Numbers turn gold. `Burn` and `Fire` take the Fire color, `Chill`, `Frost`, and `Shatter` the Frost color, `Poison` the Poison color. Text steps down from 50px to 42px to 35px as it gets longer; write at most three short lines. |
| `id`                     | Which illustration to draw, through `CARD_ART`                                                                                                                                                                                                       |

`CardDef` (TODO.md, Reference R4) has no HP and no flavor text, so those two parts of the
template are props of the component, drawn only when given:

```tsx
<Card card={CARDS.kip} />
<Card card={CARDS.kip} flavor="“Small spark. Big trouble.”" hp={5} />
```

## Characters

**Every card shows its character.** The art is a full scene: the character stands in a place
that fills the card behind the frame, with no empty background, and the character's element
is the key light.

Three characters are drawn as SVG scenes, one per tag, and they set the style for the rest:

| Card id     | File              | Scene                                                                           | Key light                      |
| ----------- | ----------------- | ------------------------------------------------------------------------------- | ------------------------------ |
| `kip`       | `KipArt.tsx`      | Flame-haired kid in a hoodie with a giant matchstick, in a brick alley at night | The match flame, top right     |
| `halvard`   | `HalvardArt.tsx`  | Bearded gatekeeper behind an ice tower shield, on a frozen rampart              | The frost crystal on his staff |
| `bog-witch` | `BogWitchArt.tsx` | Hunched witch in a crooked hat stirring a cauldron in a swamp                   | The cauldron, from below       |

The other seven starter cards are [painted](#painted-characters). A card whose id is in
neither `CARD_ART` nor `CARD_PAINTINGS` still draws: it gets a placeholder (its tag's symbol in
a glow) until its character exists. That keeps a new card from blocking on its art, but a
placeholder is not finished art.

### Painted characters

`brother-ash`, `bryn`, `nix`, `pyra`, `rook`, `sera`, and `vex` use a painting instead of an
SVG scene. Each painting was made with an image model, given a full-size render of `KipArt` as
the style reference and a prompt that follows the rules below (one character, a full scene,
the tag's color as the key light, the character's feet above y≈930). `Card.tsx` places it as
an `<image>` in the art window with `preserveAspectRatio="xMidYMid slice"`, under the same
vignette and frame as an SVG scene.

To add or replace one: save a 2:3 image as `src/assets/cards/<id>.webp` (640×960, quality
about 85, under 150 KB), import it in `src/components/art/paintings.ts` under the card's id,
and check it at full size and at hand size. An id in `CARD_ART` wins over a painting, so
drawing a card as SVG later needs no change here beyond removing the painting.

### Style rules

- **Shape:** big round head (about 200 wide), small stout body, the whole figure about 700
  tall, standing between y≈200 and y≈925.
- **Outline:** every shape of the character and the props has the ink outline `OUTLINE`
  (`#241A33`), 5px, with round joins.
- **Color:** flat mid-tone fills, or a simple two-stop gradient from the shadow side toward
  the light. Do not paint shadows or highlights by hand; the lighting recipe adds them.
- **Face:** two `Eye`s looking toward the light or the viewer, strong eyebrows, one clear
  expression that fits the name.
- **One prop that tells the story,** and it is usually the light source: a match, a crystal,
  a cauldron.
- **Setting:** a place, not a backdrop. Use two or three depth layers: a far view (an arch
  with sky, distant trees), a wall or middle ground, and one or two props in front.

### The lighting recipe

`LitScene` in `kit.tsx` applies it, the same way for every card. You give it the pieces in
flat color and where the light is:

1. the **background**, then the character's **cast shadow** on the wall behind (turn it off
   outdoors with `wallShadow={false}`),
2. the **character**, then the **foreground** props,
3. a cool violet **shade** over all of it, multiplied in and fading out toward the key light,
4. a **warm rim** on the character's edge that faces the key light,
5. a cool **moonlight rim** on the far edge,
6. the key light's **glow**, and last the **emissive** pieces (flames, crystals, sparks),
   which are never shaded.

The rims are made from masks: the character's silhouette minus a copy of itself shifted away
from the light. (A filter-based rim put a halo outside the outline in Chromium; the mask does
not.) Because the scene is relit from one position, moving `light` relights the bricks, the
ground, the props, and the character together.

### Adding a character

1. **Copy the nearest existing file** in `src/components/art/` to `<Name>Art.tsx`.
   Start from `KipArt.tsx` for an indoor or street scene, `BogWitchArt.tsx` for outdoors.
2. **Set the light.** Choose where the light source is and give `LitScene` its `light`,
   `lightColor` (the tag's bright color), `lightCore` (a near-white tint of it), and the
   character's `feet`. Add `secondary` for a second, weaker glow such as Kip's hair.
3. **Build the setting** in the background component. `BrickWall`, `Cobbles`, and `NightArch`
   take colors and a `seed`, so the same helpers give a red alley, a blue rampart, or a grey
   crypt. Change the seed to change the pattern.
4. **Draw the character** as one `<g>` with the outline set on the group. Order the shapes
   back to front: far limbs and anything held behind, legs, body, head, face, hat or hair,
   then near limbs and anything held in front.
5. **Put anything that glows in `emissive`** as well, so it is drawn at full brightness.
   If it is part of the character's outline (Kip's hair), draw it in both places.
6. **Give every gradient or clip path an id that starts with the `uid` prop,** for example
   `` `${uid}-art-kip-hoodie` ``. Many cards share one page, and ids must not collide.
7. **Register it** in `src/components/art/index.ts` under the card's id, the same id the card
   has in `packages/shared/src/engine/content/cards.ts`.
8. **Check it** at full size and at hand size (`--card-width: 16rem`). At hand size the face
   and the prop must still read. `art.test.tsx` runs on every registered character.

Art must draw the same way every time. Use `seeded(n)` from the kit for any randomness, never
`Math.random()`.

## Not carried over from v2

- **Bloom, split-tone grade, paper texture, brush streaks, film grain.** These were applied to
  the PNG after rendering. The in-app card keeps the vignette and the lighting only.
- **Base64-embedded fonts.** Fonts now come from the `@fontsource` packages through
  `fonts.css`.
- **`Docs/kip-the-matchstick-kid.png`** is the v2 render of Kip and remains the reference for
  how a finished card should feel.
