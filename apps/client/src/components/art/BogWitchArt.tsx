// The Bog Witch (Poison): a hunched swamp witch in a wide crooked hat, stirring a bubbling
// cauldron under dead trees. The cauldron is the key light, so she is lit from below.
import { Embers, Eye, LitScene, OUTLINE, seeded } from './kit.tsx';
import type { ArtProps } from './kit.tsx';
import type { ReactNode } from 'react';

const CAULDRON = { x: 690, y: 770 };

function Reeds({ seed, from, to }: { seed: number; from: number; to: number }) {
  const random = seeded(seed);
  const reeds: ReactNode[] = [];
  for (let x = from; x < to; x += 16 + random() * 22) {
    const height = 90 + random() * 150;
    const lean = (random() - 0.5) * 50;
    reeds.push(
      <path
        key={x}
        d={`M${x} 1000 Q${x + lean * 0.4} ${1000 - height * 0.6} ${x + lean} ${1000 - height}`}
        fill="none"
        stroke={random() > 0.5 ? '#4f7a3c' : '#3d6436'}
        strokeWidth={5 + random() * 4}
        strokeLinecap="round"
      />,
    );
  }
  return <g>{reeds}</g>;
}

function Swamp({ uid }: ArtProps) {
  const sky = `${uid}-art-bog-sky`;
  const water = `${uid}-art-bog-water`;
  return (
    <g>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#26305c" />
          <stop offset="0.6" stopColor="#3f6a70" />
          <stop offset="1" stopColor="#6c9a6a" />
        </linearGradient>
        <linearGradient id={water} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a7a5c" />
          <stop offset="1" stopColor="#2c4a4a" />
        </linearGradient>
      </defs>
      <rect width="1000" height="820" fill={`url(#${sky})`} />
      <circle cx="230" cy="290" r="96" fill="#eef6d8" opacity="0.16" />
      <circle cx="230" cy="290" r="56" fill="#f2f6de" />
      <path d="M196 262 a18 18 0 1 0 1 0 Z M250 310 a10 10 0 1 0 1 0 Z" fill="#d8dcc0" />
      {/* Far trees, as flat shapes in the mist. */}
      <g fill="#33506a" opacity="0.7">
        <path d="M40 820 V470 L10 400 L44 440 L52 340 L66 440 L104 380 L74 480 V820 Z" />
        <path d="M400 820 V520 L370 450 L404 490 L416 400 L428 492 L462 440 L434 530 V820 Z" />
        <path d="M900 820 V440 L862 360 L904 410 L916 300 L930 414 L972 350 L936 450 V820 Z" />
      </g>
      {/* A near dead tree arching over from the left. */}
      <g fill="#2a2c44" stroke={OUTLINE} strokeWidth="4" strokeLinejoin="round">
        <path d="M-10 820 V150 H90 Q150 330 110 520 Q90 680 130 820 Z" />
        <path d="M80 250 Q220 190 330 240 Q230 230 110 310 Z" />
        <path d="M100 420 Q200 400 260 450 Q190 440 108 480 Z" />
        <path d="M60 150 Q140 90 250 110 Q160 120 96 190 Z" />
      </g>
      {/* Hanging moss. */}
      <g fill="none" stroke="#587a48" strokeWidth="6" strokeLinecap="round" opacity="0.9">
        <path d="M170 228 V300 M210 222 V330 M250 228 V290 M290 236 V316" />
        <path d="M150 440 V500 M196 434 V520 M236 446 V496" />
      </g>
      {/* Water and the mud bank. */}
      <rect y="800" width="1000" height="600" fill={`url(#${water})`} />
      <g fill="none" stroke="#9cc8a0" strokeWidth="3" opacity="0.5">
        <path d="M60 850 H190 M260 880 H420 M40 930 H150 M840 846 H960 M780 900 H900" />
      </g>
      <path
        d="M180 1400 V900 Q300 840 480 850 Q700 830 880 880 Q960 900 1000 960 V1400 Z"
        fill="#4a4038"
        stroke={OUTLINE}
        strokeWidth="5"
      />
      <g fill="#7ab04a" stroke={OUTLINE} strokeWidth="3">
        <ellipse cx="90" cy="880" rx="44" ry="12" />
        <ellipse cx="130" cy="950" rx="34" ry="10" />
        <ellipse cx="930" cy="860" rx="36" ry="10" />
      </g>
    </g>
  );
}

function Witch({ uid }: ArtProps) {
  const robe = `${uid}-art-bog-robe`;
  const skin = `${uid}-art-bog-skin`;
  return (
    <g stroke={OUTLINE} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
      <defs>
        <linearGradient id={robe} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a3f86" />
          <stop offset="1" stopColor="#3f6a52" />
        </linearGradient>
        <linearGradient id={skin} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fb86a" />
          <stop offset="1" stopColor="#b8d884" />
        </linearGradient>
      </defs>

      {/* Robe: a hunched bell shape with a ragged hem. */}
      <path
        d="M300 600 Q290 500 380 470 L520 470 Q600 500 596 600 L640 900 L596 884 L560 920 L520 886 L470 922 L430 886 L380 920 L346 884 L290 904 Z"
        fill={`url(#${robe})`}
      />
      <path d="M430 640 L440 886 M500 650 L506 890" fill="none" strokeWidth="3" opacity="0.4" />
      <path d="M306 650 Q450 690 606 650 L610 680 Q450 722 302 680 Z" fill="#8a6a3a" />
      {/* Charms on the belt. */}
      <g strokeWidth="3">
        <path d="M380 690 V730" fill="none" />
        <circle cx="380" cy="742" r="14" fill="#9bd64a" />
        <path d="M536 690 V722" fill="none" />
        <path d="M524 722 H548 L542 764 H530 Z" fill="#d8c8a0" />
      </g>

      {/* Shawl. */}
      <path
        d="M330 540 Q360 470 450 478 Q540 470 580 540 Q520 600 450 580 Q380 600 330 540 Z"
        fill="#3a2c5c"
      />

      {/* Head, pushed forward. */}
      <ellipse cx="478" cy="410" rx="92" ry="90" fill={`url(#${skin})`} />
      <ellipse cx="392" cy="420" rx="16" ry="22" fill={`url(#${skin})`} />
      {/* Stringy grey hair. */}
      <path
        d="M394 380 Q370 470 384 560 L410 500 L420 570 L436 470 Z M566 380 Q596 460 582 548 L562 494 L548 560 L540 462 Z"
        fill="#c8c8d8"
      />
      <Eye at={{ x: 452, y: 400 }} rx={22} ry={24} iris="#c8d82a" look={{ x: 8, y: 6 }} />
      <Eye at={{ x: 524, y: 402 }} rx={18} ry={20} iris="#c8d82a" look={{ x: 7, y: 6 }} />
      <path d="M424 370 Q452 350 478 374" fill="none" strokeWidth="8" stroke="#5a5a6c" />
      <path d="M504 376 Q526 360 548 372" fill="none" strokeWidth="8" stroke="#5a5a6c" />
      {/* A long hooked nose with a wart. */}
      <path d="M484 410 Q560 436 572 480 Q536 484 500 462 Z" fill="#a4cc78" />
      <circle cx="548" cy="462" r="6" fill="#6a8a48" strokeWidth="3" />
      {/* A crooked grin with one tooth. */}
      <path d="M428 468 Q470 508 530 482 Q474 490 428 468 Z" fill="#3a1f3a" />
      <path d="M470 486 L478 500 L488 488 Z" fill="#fffaf0" strokeWidth="3" />

      {/* The hat: wide brim, bent point, a buckle. */}
      <path d="M318 356 Q478 300 650 352 Q480 372 318 356 Z" fill="#2c2444" />
      <path
        d="M394 344 Q430 220 500 150 Q560 96 640 120 Q576 138 556 200 Q548 280 566 344 Q480 330 394 344 Z"
        fill="#3a2c5c"
      />
      <path d="M396 338 Q480 322 566 338 L568 306 Q480 290 404 306 Z" fill="#7ab04a" />
      <rect x="462" y="298" width="40" height="34" rx="4" fill="#c9a44a" />

      {/* The near arm reaching out with the ladle. */}
      <path d="M540 530 Q640 520 690 600 L650 640 Q610 590 540 600 Z" fill={`url(#${robe})`} />
      <path
        d="M660 598 Q654 574 680 568 L716 580 Q732 598 722 622 L698 642 Q668 642 660 598 Z"
        fill={`url(#${skin})`}
      />
      <path d="M700 560 L716 760" fill="none" stroke={OUTLINE} strokeWidth="20" />
      <path d="M700 560 L716 760" fill="none" stroke="#a88a5a" strokeWidth="10" />
      {/* The far arm, a hand cupped over the pot. */}
      <path d="M330 560 Q300 640 370 680 L400 644 Q368 620 378 566 Z" fill={`url(#${robe})`} />
      <path
        d="M362 660 Q352 640 374 630 L410 640 Q424 656 416 676 L396 692 Q368 692 362 660 Z"
        fill={`url(#${skin})`}
      />
    </g>
  );
}

function CauldronPot() {
  return (
    <g stroke={OUTLINE} strokeWidth="5" strokeLinejoin="round">
      {/* Logs. */}
      <path d="M560 950 L640 900 L660 930 L580 978 Z" fill="#6a4a34" />
      <path d="M840 950 L760 900 L740 930 L820 978 Z" fill="#6a4a34" />
      {/* The pot. */}
      <path d="M560 790 Q540 940 700 950 Q860 940 840 790 Z" fill="#2c2c40" />
      <path
        d="M548 770 Q700 730 852 770 Q860 800 840 800 Q700 770 560 800 Q540 800 548 770 Z"
        fill="#44445c"
      />
      <path d="M590 930 L574 980 M810 930 L826 980" fill="none" strokeWidth="14" />
      {/* Mushrooms and reeds in front. */}
      <path d="M250 960 Q250 916 300 916 Q350 916 350 960 Z" fill="#c84a4a" />
      <rect x="288" y="958" width="24" height="40" fill="#f1e6d6" />
      <circle cx="282" cy="940" r="7" fill="#fffaf0" stroke="none" />
      <circle cx="318" cy="934" r="6" fill="#fffaf0" stroke="none" />
      <Reeds seed={4} from={-10} to={210} />
      <Reeds seed={8} from={900} to={1010} />
    </g>
  );
}

/** The brew and what rises off it. */
function Brew() {
  return (
    <g>
      <ellipse cx="700" cy="776" rx="136" ry="24" fill="#b8f060" />
      <ellipse cx="700" cy="776" rx="96" ry="14" fill="#e8ffb0" />
      <g fill="#c8f478" stroke="#eaffc0" strokeWidth="3">
        <circle cx="640" cy="760" r="18" />
        <circle cx="742" cy="752" r="24" />
        <circle cx="690" cy="700" r="14" />
        <circle cx="770" cy="660" r="10" />
        <circle cx="650" cy="620" r="8" />
        <circle cx="720" cy="570" r="6" />
      </g>
      <g fill="none" stroke="#c8f478" strokeWidth="10" strokeLinecap="round" opacity="0.45">
        <path d="M640 720 Q600 640 660 580 Q710 520 670 440" />
        <path d="M760 720 Q810 650 770 590 Q740 530 790 460" />
      </g>
    </g>
  );
}

export function BogWitchArt({ uid }: ArtProps) {
  return (
    <LitScene
      uid={uid}
      light={CAULDRON}
      lightColor="#9bd64a"
      lightCore="#eaffb0"
      reach={820}
      feet={{ x: 460, y: 910 }}
      wallShadow={false}
      background={<Swamp uid={uid} />}
      character={<Witch uid={uid} />}
      foreground={<CauldronPot />}
      emissive={
        <>
          <Brew />
          <Embers seed={14} around={{ x: 620, y: 520 }} color="#d4f890" count={20} />
        </>
      }
    />
  );
}
