// Kip, the Matchstick Kid (Fire): a grinning kid with flame hair in a soot-stained hoodie,
// gripping a giant lit matchstick in a brick alley at night. The match flame is the key light.
import { BrickWall, Cobbles, Embers, Eye, Flame, LitScene, NightArch, OUTLINE } from './kit.tsx';
import type { ArtProps } from './kit.tsx';

const FLAME = { x: 772, y: 262 };

function Alley({ uid }: ArtProps) {
  return (
    <g>
      <BrickWall
        seed={7}
        x={0}
        y={0}
        width={1000}
        height={800}
        colors={['#a85a4c', '#9a4f48', '#b36a52', '#8c4646', '#a05248']}
        mortar="#4a2c3c"
      />
      <NightArch
        uid={uid}
        x={78}
        width={250}
        top={300}
        bottom={800}
        sky={['#3d3fa8', '#7a78dc']}
        skyline="#3b3a8a"
        stone="#7b5560"
      />
      {/* A clothesline across the arch. */}
      <path d="M92 548 Q200 572 318 544" fill="none" stroke="#2c2a5e" strokeWidth="3" />
      <rect x="150" y="556" width="26" height="30" fill="#b8a05a" opacity="0.8" />
      <rect x="236" y="558" width="24" height="28" fill="#8a5a8a" opacity="0.8" />
      {/* A dead lantern on its bracket. */}
      <g stroke={OUTLINE} strokeWidth="4">
        <path d="M200 150 V214" fill="none" />
        <path d="M176 214 H224 L216 270 H184 Z" fill="#4a6a9a" />
        <path d="M172 210 H228" strokeWidth="8" />
      </g>
      {/* The door. */}
      <g stroke={OUTLINE} strokeWidth="5" strokeLinejoin="round">
        <path d="M772 800 V500 Q870 398 968 500 V800 Z" fill="#6f5a66" />
        <path d="M794 800 V510 Q870 430 946 510 V800 Z" fill="#8a5630" />
        <path
          d="M832 800 V470 M870 800 V452 M908 800 V470"
          fill="none"
          strokeWidth="3"
          opacity="0.55"
        />
        <rect x="790" y="512" width="160" height="20" fill="#4a4658" />
        <rect x="790" y="690" width="160" height="20" fill="#4a4658" />
        <circle cx="818" cy="610" r="15" fill="none" strokeWidth="7" stroke="#3a3648" />
      </g>
      <Cobbles
        seed={11}
        top={796}
        bottom={1400}
        colors={['#7d5670', '#8c6078', '#6f4c68', '#96687c']}
        gap="#35233f"
      />
    </g>
  );
}

function Props() {
  return (
    <g stroke={OUTLINE} strokeWidth="5" strokeLinejoin="round">
      {/* Crates, bottom left. */}
      <rect x="-10" y="656" width="172" height="118" fill="#7c4c30" />
      <path d="M-10 656 L162 774 M-10 696 H162" fill="none" strokeWidth="3" opacity="0.6" />
      <rect x="-10" y="770" width="212" height="210" fill="#8a5636" />
      <path d="M-10 980 L202 770 M-10 820 H202" fill="none" strokeWidth="3" opacity="0.6" />
      {/* A barrel, bottom right. */}
      <path d="M872 772 Q860 870 874 978 H1010 V772 Z" fill="#a8743e" />
      <path d="M866 826 H1010 M868 930 H1010" fill="none" stroke="#4a4658" strokeWidth="12" />
      <ellipse cx="942" cy="772" rx="72" ry="16" fill="#c08a4c" />
      {/* A puddle. */}
      <ellipse cx="770" cy="940" rx="80" ry="12" fill="#3a3a78" stroke="none" opacity="0.8" />
    </g>
  );
}

function Kip({ uid }: ArtProps) {
  const hoodie = `${uid}-art-kip-hoodie`;
  const skin = `${uid}-art-kip-skin`;
  return (
    <g stroke={OUTLINE} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
      <defs>
        <linearGradient id={hoodie} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b8452c" />
          <stop offset="1" stopColor="#e87a34" />
        </linearGradient>
        <linearGradient id={skin} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e2a078" />
          <stop offset="1" stopColor="#f8c898" />
        </linearGradient>
      </defs>

      {/* Legs and boots. */}
      <path d="M404 730 L388 884 L456 888 L476 744 Z" fill="#454a8c" />
      <path d="M500 744 L522 884 L592 882 L594 730 Z" fill="#454a8c" />
      <rect x="532" y="792" width="38" height="32" fill="#6c7040" strokeWidth="3" />
      <path d="M380 878 Q360 916 398 922 L462 922 Q474 896 456 876 Z" fill="#6e4428" />
      <path d="M516 876 Q500 918 540 922 L628 922 Q640 892 596 874 Z" fill="#6e4428" />

      {/* Hoodie. */}
      <path
        d="M372 566 Q356 520 404 506 L564 506 Q624 522 618 584 L628 742 Q494 782 366 748 Z"
        fill={`url(#${hoodie})`}
      />
      <path d="M428 664 Q494 642 562 664 L568 722 Q494 738 422 722 Z" fill="#a83c26" />
      <path d="M366 748 Q494 782 628 742 L630 760 Q494 800 364 766 Z" fill="#8f3222" />

      {/* The arm on the far side, reaching up the stick. */}
      <path d="M572 512 Q640 492 668 452 L706 486 Q670 546 606 584 Z" fill={`url(#${hoodie})`} />

      {/* Head. */}
      <ellipse cx="388" cy="442" rx="20" ry="26" fill={`url(#${skin})`} />
      <ellipse cx="482" cy="418" rx="104" ry="100" fill={`url(#${skin})`} />
      <ellipse cx="426" cy="446" rx="20" ry="11" fill="#2a1a2a" stroke="none" opacity="0.28" />
      <g fill="#b06a4a" stroke="none">
        <circle cx="506" cy="456" r="3" />
        <circle cx="520" cy="462" r="3" />
        <circle cx="494" cy="466" r="3" />
        <circle cx="560" cy="452" r="3" />
        <circle cx="548" cy="462" r="3" />
      </g>
      <Eye at={{ x: 456, y: 410 }} rx={26} ry={28} iris="#9a5a20" look={{ x: 7, y: 4 }} />
      <Eye at={{ x: 538, y: 412 }} rx={23} ry={25} iris="#9a5a20" look={{ x: 6, y: 4 }} />
      <path d="M424 376 Q452 356 484 380" fill="none" strokeWidth="9" stroke="#8a3a1c" />
      <path d="M514 382 Q542 362 568 384" fill="none" strokeWidth="9" stroke="#8a3a1c" />
      <path d="M500 430 q10 12 -3 20" fill="none" strokeWidth="4" />
      <path d="M438 462 Q498 528 566 456 Q500 482 438 462 Z" fill="#7a1f24" />
      <path
        d="M452 468 Q500 486 552 464 L546 476 Q500 498 460 480 Z"
        fill="#fffaf0"
        strokeWidth="3"
      />

      {/* Hood collar and drawstrings. */}
      <path
        d="M392 520 Q484 590 580 518 Q600 498 566 492 Q486 548 410 494 Q376 498 392 520 Z"
        fill="#9c3826"
      />
      <path d="M462 548 L456 606 M506 550 L508 596" fill="none" stroke="#f1e6d6" strokeWidth="5" />
      <rect x="450" y="604" width="12" height="16" fill="#7a8ad0" strokeWidth="3" />
      <rect x="502" y="594" width="12" height="16" fill="#7a8ad0" strokeWidth="3" />

      {/* The matchstick. */}
      <path d="M338 926 L760 292" fill="none" stroke={OUTLINE} strokeWidth="32" />
      <path d="M338 926 L760 292" fill="none" stroke="#d2a460" strokeWidth="22" />
      <path d="M344 918 L756 300" fill="none" stroke="#f0cc8c" strokeWidth="6" opacity="0.7" />
      <ellipse cx="764" cy="286" rx="34" ry="26" fill="#8c2c1c" transform="rotate(-56 764 286)" />

      {/* The near arm and both gloved hands, over the stick. */}
      <path d="M384 556 Q356 650 468 684 L500 640 Q432 616 426 548 Z" fill={`url(#${hoodie})`} />
      <g fill="#34345c">
        <path d="M478 630 Q470 606 496 600 L540 612 Q560 628 548 656 L520 684 Q486 684 478 630 Z" />
        <path d="M622 434 Q614 410 640 404 L684 416 Q704 432 692 460 L664 488 Q630 488 622 434 Z" />
      </g>
      <g fill="none" strokeWidth="3" opacity="0.7">
        <path d="M494 626 L536 640 M490 646 L530 660" />
        <path d="M638 430 L680 444 M634 450 L674 464" />
      </g>

      {/* Flame hair, drawn last so it overlaps the head. */}
      <Hair />
    </g>
  );
}

/** Kip's hair. It is part of his outline, and it is drawn again unshaded because it glows. */
function Hair() {
  return (
    <g stroke="none">
      <Flame at={{ x: 410, y: 372 }} scale={0.6} rotate={-30} />
      <Flame at={{ x: 552, y: 366 }} scale={0.64} rotate={26} />
      <Flame at={{ x: 478, y: 356 }} scale={1.08} />
    </g>
  );
}

export function KipArt({ uid }: ArtProps) {
  return (
    <LitScene
      uid={uid}
      light={FLAME}
      lightColor="#f59a2c"
      lightCore="#ffe07a"
      secondary={{ x: 480, y: 300 }}
      feet={{ x: 500, y: 920 }}
      background={<Alley uid={uid} />}
      character={<Kip uid={uid} />}
      foreground={<Props />}
      emissive={
        <>
          <Hair />
          <Flame at={{ x: FLAME.x + 6, y: FLAME.y + 14 }} scale={0.92} rotate={10} />
          <Embers seed={3} around={{ x: 560, y: 420 }} color="#ffb347" />
        </>
      }
    />
  );
}
