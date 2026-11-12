// Halvard, the Icewarden (Frost): a stout, bearded gatekeeper on a frozen rampart, braced
// behind a tower shield of ice, holding up a staff with a glowing frost crystal. The crystal
// is the key light.
import { BrickWall, Cobbles, Embers, Eye, LitScene, NightArch, OUTLINE } from './kit.tsx';
import type { ArtProps } from './kit.tsx';

const CRYSTAL = { x: 742, y: 250 };

function Rampart({ uid }: ArtProps) {
  return (
    <g>
      <BrickWall
        seed={21}
        x={0}
        y={0}
        width={1000}
        height={800}
        colors={['#7f8fb4', '#8c9cc0', '#7484aa', '#98a8c8', '#6c7ca4']}
        mortar="#3a4468"
        brick={{ width: 132, height: 62 }}
      />
      <NightArch
        uid={uid}
        x={70}
        width={270}
        top={280}
        bottom={800}
        sky={['#2c3f8c', '#7fb0e0']}
        skyline="#dfeaf8"
        stone="#a9b6d2"
      />
      {/* Icicles along the top of the wall. */}
      <g fill="#dff3ff" stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round">
        <path d="M380 140 L398 250 L416 140 Z" />
        <path d="M430 140 L442 210 L454 140 Z" />
        <path d="M560 140 L582 290 L604 140 Z" />
        <path d="M616 140 L628 204 L640 140 Z" />
        <path d="M850 140 L870 270 L890 140 Z" />
        <path d="M900 140 L912 220 L924 140 Z" />
      </g>
      {/* A frozen banner on the right. */}
      <g stroke={OUTLINE} strokeWidth="5" strokeLinejoin="round">
        <path d="M800 300 H950 V620 L875 570 L800 620 Z" fill="#3f6fb4" />
        <path d="M875 370 V500 M830 410 L920 460 M920 410 L830 460" fill="none" stroke="#dff3ff" />
        <path d="M790 300 H960" strokeWidth="12" stroke="#5a4a50" />
      </g>
      {/* Snow-dusted flagstones. */}
      <Cobbles
        seed={5}
        top={796}
        bottom={1400}
        colors={['#aab8d6', '#bcc8e0', '#9caccc', '#cdd8ec']}
        gap="#4a5680"
      />
      <path
        d="M0 800 Q120 770 250 800 Q400 826 560 796 Q760 770 1000 806 V830 H0 Z"
        fill="#eef6ff"
      />
    </g>
  );
}

function Drifts() {
  return (
    <g stroke={OUTLINE} strokeWidth="5" strokeLinejoin="round">
      <path d="M-10 990 Q20 820 130 800 Q230 830 250 990 Z" fill="#e6f1ff" />
      <path d="M800 990 Q840 850 930 836 Q1000 850 1010 990 Z" fill="#e6f1ff" />
      {/* A brazier gone cold. */}
      <path d="M40 700 H170 L150 780 H60 Z" fill="#5a5a72" />
      <path d="M80 780 L62 840 M130 780 L148 840" fill="none" strokeWidth="8" />
    </g>
  );
}

function Halvard({ uid }: ArtProps) {
  const coat = `${uid}-art-halvard-coat`;
  const ice = `${uid}-art-halvard-ice`;
  return (
    <g stroke={OUTLINE} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
      <defs>
        <linearGradient id={coat} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2f528f" />
          <stop offset="1" stopColor="#4f86c8" />
        </linearGradient>
        <linearGradient id={ice} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8f8ff" />
          <stop offset="0.5" stopColor="#9fdcf4" />
          <stop offset="1" stopColor="#5aa6dc" />
        </linearGradient>
      </defs>

      {/* The staff, behind everything, held up in the far hand. */}
      <path d="M700 924 L738 300" fill="none" stroke={OUTLINE} strokeWidth="26" />
      <path d="M700 924 L738 300" fill="none" stroke="#8a6a4a" strokeWidth="16" />
      <path d="M704 316 Q742 356 778 318 L760 290 H722 Z" fill="#c9a44a" />

      {/* Boots and legs. */}
      <path d="M430 760 L424 880 L500 884 L508 766 Z" fill="#3a3a5c" />
      <path d="M540 766 L548 884 L626 880 L620 760 Z" fill="#3a3a5c" />
      <path d="M410 872 Q396 920 436 924 L510 924 Q520 892 502 870 Z" fill="#6a4a34" />
      <path d="M544 870 Q530 922 568 924 L650 924 Q664 892 628 870 Z" fill="#6a4a34" />

      {/* The coat: wide and heavy, with a belt. */}
      <path
        d="M372 560 Q360 500 430 486 L620 486 Q694 500 682 566 L700 790 Q530 832 356 790 Z"
        fill={`url(#${coat})`}
      />
      <path d="M362 690 Q530 728 694 690 L696 724 Q530 764 360 724 Z" fill="#6a4a34" />
      <rect x="500" y="694" width="54" height="46" rx="6" fill="#c9a44a" />

      {/* The far arm, raised to the staff. */}
      <path d="M640 510 Q716 500 742 560 L700 600 Q676 566 628 580 Z" fill={`url(#${coat})`} />
      <path
        d="M690 548 Q684 520 712 514 L752 526 Q770 544 758 570 L732 594 Q698 596 690 548 Z"
        fill="#7a5a44"
      />

      {/* Fur collar. */}
      <path
        d="M380 520 Q400 468 450 480 Q470 452 520 470 Q570 450 600 478 Q650 466 676 520 Q650 566 600 548 Q570 578 524 556 Q476 580 448 550 Q400 566 380 520 Z"
        fill="#eef2f8"
      />

      {/* Head, under a steel cap. */}
      <ellipse cx="526" cy="400" rx="98" ry="96" fill="#f0c0a0" />
      <Eye at={{ x: 492, y: 392 }} rx={20} ry={22} iris="#3f7fc0" look={{ x: 6, y: 2 }} />
      <Eye at={{ x: 566, y: 392 }} rx={19} ry={21} iris="#3f7fc0" look={{ x: 6, y: 2 }} />
      <path d="M462 366 L514 372" fill="none" strokeWidth="12" stroke="#e8eef6" />
      <path d="M546 372 L596 364" fill="none" strokeWidth="12" stroke="#e8eef6" />
      <path d="M520 404 q16 16 -2 30" fill="#e8a888" strokeWidth="4" />
      {/* Beard and moustache, frosted white. */}
      <path
        d="M434 420 Q430 520 480 548 L500 520 L526 566 L552 520 L574 548 Q624 518 620 420 Q580 452 526 446 Q472 452 434 420 Z"
        fill="#e8eef6"
      />
      <path d="M470 446 Q526 420 584 446 Q556 470 526 456 Q498 470 470 446 Z" fill="#f8fbff" />
      {/* Cap with a nose guard and two small horns. */}
      <path d="M426 384 Q420 290 526 286 Q632 290 628 384 Q526 344 426 384 Z" fill="#9aa6c0" />
      <path d="M420 380 Q526 338 632 380 L632 400 Q526 360 420 400 Z" fill="#c9a44a" />
      <path d="M516 352 H538 V420 H516 Z" fill="#9aa6c0" />
      <path d="M432 330 Q380 310 372 250 Q410 280 446 300 Z" fill="#f1e8d6" />
      <path d="M620 330 Q672 310 680 250 Q642 280 606 300 Z" fill="#f1e8d6" />

      {/* The ice tower shield, in front, on the near arm. */}
      <path d="M392 560 Q372 640 430 700 L470 660 Q438 620 446 560 Z" fill={`url(#${coat})`} />
      <path
        d="M236 520 L330 486 L424 520 L430 760 Q420 860 330 912 Q240 860 230 760 Z"
        fill={`url(#${ice})`}
      />
      <path
        d="M262 544 L330 520 L398 544 L402 752 Q394 826 330 868 Q266 826 258 752 Z"
        fill="none"
        stroke="#f4fcff"
        strokeWidth="4"
        opacity="0.8"
      />
      <path
        d="M330 590 V800 M258 642 L402 748 M402 642 L258 748 M300 606 L330 636 L360 606 M300 784 L330 754 L360 784"
        fill="none"
        stroke="#f4fcff"
        strokeWidth="9"
      />
      <path d="M256 560 L296 720 L246 700 Z" fill="#ffffff" stroke="none" opacity="0.35" />
      <path
        d="M404 640 Q396 616 420 608 L452 622 Q466 640 456 662 L436 682 Q408 682 404 640 Z"
        fill="#7a5a44"
      />
    </g>
  );
}

/** The frost crystal on the staff: a faceted shard with a halo. */
function Crystal() {
  return (
    <g>
      <circle cx={CRYSTAL.x} cy={CRYSTAL.y} r="96" fill="#bfeaff" opacity="0.22" />
      <circle cx={CRYSTAL.x} cy={CRYSTAL.y} r="58" fill="#dff6ff" opacity="0.3" />
      <path
        d="M742 150 L792 240 L760 330 H724 L692 240 Z"
        fill="#aee4fa"
        stroke="#f4fcff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M742 150 L742 330 M692 240 H792" stroke="#f4fcff" strokeWidth="3" opacity="0.8" />
      <path d="M742 150 L792 240 L742 240 Z" fill="#ffffff" opacity="0.55" />
    </g>
  );
}

export function HalvardArt({ uid }: ArtProps) {
  return (
    <LitScene
      uid={uid}
      light={CRYSTAL}
      lightColor="#7fd3f0"
      lightCore="#e8faff"
      feet={{ x: 520, y: 922 }}
      background={<Rampart uid={uid} />}
      character={<Halvard uid={uid} />}
      foreground={<Drifts />}
      emissive={
        <>
          <Crystal />
          <Embers seed={9} around={{ x: 520, y: 420 }} color="#e8faff" count={26} />
        </>
      }
    />
  );
}
