// 8x8 pixel sprites, drawn at 2x onto 16px tiles. Each sprite is 8 rows separated by '/',
// one character per pixel; '.' is transparent and every other character is a palette key.
// Placeholder art: swap any entry here (or replace this file with a sprite sheet loader).

const PAL: Record<string, string> = {
  k: '#15121c', w: '#ffffff', h: '#e8c170', c: '#3d6bb8', d: '#243a6b',
  g: '#5ac54f', G: '#2f8a3a', b: '#e8e4d0', B: '#9a947c', p: '#8a5fb8', P: '#5a3a80',
  r: '#e04a2a', o: '#ffa030', y: '#ffe060', Y: '#c89a20', i: '#9fe8ff', I: '#4aa0d0',
  m: '#8a6a3a', M: '#5d4526', s: '#b8c0d0', S: '#6a7288', t: '#4a8a5a', T: '#2d5a3a',
  v: '#7a4ab8', R: '#c03818', x: '#e04060', n: '#2a2a3a',
};

const ART: Record<string, string> = {
  player: '..cccc../.cccccc./.chhhhc./.chkhkc./..hhhh../.cccccc./.cdccdc./..d..d..',
  slime: '......../......../..gggg../.gggggg./gwkggwkg/gggggggg/GggggggG/.GGGGGG.',
  sentinel: '..bbbb../.bkbbkb./.bbbbbb./..bBBb../.BbbbbB./b.bBBb.b/..b..b../.bb..bb.',
  bat: '......../p......p/pp.pp.pp/pppppppp/pPrpprPp/.PppppP./..p..p../........',
  imp: 'r......r/rr.rr.rr/.rrrrrr./.ryrryr./.rrrrrr./..roor../.rr..rr./.o....o.',
  wraith: '..iiii../.iiiiii./.iwiiwi./.iiiiii./.iiIIii./.iiiiii./.i.ii.i./i..i...i',
  shambler: '..rrrr../.rwrrwr./rrrrrrrr/..mmmm../.mkmmkm./.mmmmmm./.mgmmgm./.mm..mm.',
  knight: '...r..../..ssss../.sskkss./.ssssss./SssssssS/.sSSSSs./.ss..ss./.SS..SS.',
  troll: '.tttttt./ttkttktt/tttttttt/twttttwt/.tttttt./TttttttT/Ttt..ttT/.TT..TT.',
  mimic: '.mmmmmm./mymmmmym/mmmmmmmm/wkwkwkwk/kxxxxxxk/wkwkwkwk/mmmmmmmm/.mmmmmm.',
  mimic_idle: '......../.mmmmmm./mmmmmmmm/myyyyyym/mwmyymwm/mmmmmmmm/mmmmmmmm/........',
  chest: '......../.mmmmmm./mmmmmmmm/myyyyyym/mmmyymmm/mmmmmmmm/mmmmmmmm/........',
  spider: 'n......n/.n.nn.n./..nnnn../nnnrrnnn/..nnnn../.n.nn.n./n..nn..n/........',
  beetle: '...r..../..nnnn../.noooon./.onoono./.noooon./.onoono./..nnnn../.n....n.',
  hulk: '.kkkkkk./kRoRRoRk/kRyRRyRk/kRooooRk/kRRRRRRk/kRokkoRk/kkR..Rkk/.kk..kk.',
  warden: '.y.yy.y./.yyyyyy./.vkvvkv./.vvvvvv./vvvyyvvv/.vvvvvv./.vv..vv./.kk..kk.',
  key: '......../..yyy.../.y...y../..yyy.../...y..../...yy.../...y..../...yy...',
  gold: '......../..yyyy../.yyYYyy./.yYyyYy./.yYyyYy./.yyYYyy./..yyyy../........',
  potion: '...mm.../...ww.../..wxxw../.wxxxxw./.wxxwxw./.wxxxxw./..wwww../........',
  crate: 'MMMMMMMM/MmmMMmmM/MmMmmMmM/MMmmmmMM/MMmmmmMM/MmMmmMmM/MmmMMmmM/MMMMMMMM',
  ice: 'IIIIIIII/IwwiiiiI/IwiiiiiI/IiiiiiiI/IiiiiiiI/IiiiiiwI/IiiiiwwI/IIIIIIII',
  bait: '......../.....ww./..xxxw../.xxxxx../.xxxxx../..xxx.../.w....../ww......',
};

const cache = new Map<string, HTMLCanvasElement>();

export function sprite(name: string): HTMLCanvasElement {
  let cv = cache.get(name);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = cv.height = 16;
  const ctx = cv.getContext('2d')!;
  const rows = (ART[name] ?? ART.slime).split('/');
  rows.forEach((row, y) => {
    for (let x = 0; x < 8; x++) {
      if (row[x] === '.' || !row[x]) continue;
      ctx.fillStyle = PAL[row[x]] ?? '#ff00ff';
      ctx.fillRect(x * 2, y * 2, 2, 2);
    }
  });
  cache.set(name, cv);
  return cv;
}
