import { edgePoints, wallEdges, corners, fromPlane } from './hex.js';
import { swingPose, bladeSegment, aimAngle, MELEE, ENEMY_REACH } from './combat.js';
import { bossAttackSpec, PARTS, blocked, distance } from './game.js';

function line(c, points, color, width = 1) {
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round';
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.stroke();
}
function oval(c, x, y, rx, ry, color) {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

export function drawFloor(r, p) {
  const c = r.ctx;
  r.hex(p.x, p.y, .97, p.hp <= 0 ? '#575942' : '#968253', '#c6af7d55');
  c.save();c.beginPath();corners(p.x,p.y,.94).forEach((v,i)=>{const q=r.screen(v.x,v.y);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});c.closePath();c.clip();
  for (let i = -2; i <= 2; i++) {
    const a = r.screen(p.x + i * .18, p.y - .47), b = r.screen(p.x + i * .18, p.y + .47);
    line(c, [[a.x, a.y], [b.x, b.y]], '#4e452fa0');
    const grain = r.screen(p.x + i * .18 + .07, p.y);
    line(c, [[grain.x - 5, grain.y + 2], [grain.x + 4, grain.y - 2]], '#d1b57a55');
  }
  for (const x of [-.36, .36]) for (const y of [-.36, .36]) {
    const q = r.screen(p.x + x, p.y + y);
    oval(c, q.x, q.y, 1, .7, '#433e31');
  }
  c.restore();
}

function thinWall(r,p,g) {
  const c=r.ctx,h=r.scale*1.18,stone=p.type==='reinforce';
  for(const edge of wallEdges(p)) {
    const [u,v]=edgePoints(p,edge),a=r.screen(u.x,u.y),b=r.screen(v.x,v.y);
    const end=p.type==='door'&&p.open?{x:a.x+(b.x-a.x)*.35-(b.y-a.y)*.8,y:a.y+(b.y-a.y)*.35+(b.x-a.x)*.2}:b;
    r.poly([[a.x,a.y],[end.x,end.y],[end.x,end.y-h],[a.x,a.y-h]],stone?'#667b77':'#8c7149','#66553b');
    // Horizontal log courses reach the shared vertex: one continuous wall, no door frames.
    for(let row=1;row<6;row++){
      const z=h*row/6;line(c,[[a.x,a.y-z],[end.x,end.y-z]],stone?'#384d4d':'#52412d',2);
      line(c,[[a.x,a.y-z-1],[end.x,end.y-z-1]],stone?'#acb6a35a':'#ddbb7a55',1);
      if(stone){const t=row%2?.33:.67,x=a.x+(end.x-a.x)*t,y=a.y+(end.y-a.y)*t;line(c,[[x,y-z],[x,y-z-h/6]],'#3c5050');}
    }
    line(c,[[a.x,a.y-h],[end.x,end.y-h]],stone?'#b0b8a5':'#c7a36c',4);
    if(p.type==='door'){
      for(const q of [a,b])line(c,[[q.x,q.y],[q.x,q.y-h-2]],'#d0ae73',3);
      line(c,[[a.x,a.y-h+4],[end.x,end.y-4]],'#ceae71',3);
      oval(c,a.x+(end.x-a.x)*.8,a.y+(end.y-a.y)*.8-h*.4,2,2,'#e5c994');
    }
  }
}

export function drawBuilding(r, p, g) {
  const c = r.ctx, q = r.screen(p.x, p.y), s = r.scale;
  c.save();
  oval(c, q.x + 3, q.y + 3, s * .85, s * .35, '#071b1933');
  if (p.hp <= 0) {
    // A breach is visibly rubble, rather than an intact translucent wall.
    for (let i = 0; i < 4; i++) r.box(p.x + (i % 2 - .5) * .45, p.y + (Math.floor(i / 2) - .5) * .45, .22, 3 + i * 2, ['#8d8262', '#4e5545', '#66664b']);
    line(c, [[q.x - 16, q.y + 4], [q.x + 15, q.y - 5]], '#a18c5f', 4);
    c.restore(); return;
  }
  if (['wall', 'reinforce', 'door'].includes(p.type)) {
    if (distance(p, g.player) < 2.8 && p.x + p.y*1.3660254 > g.player.x + g.player.y*1.3660254) c.globalAlpha = .48;
    thinWall(r,p,g);
  } else if (p.type === 'fire') {
    r.diamond(p.x, p.y, .62, '#38382c');
    line(c, [[q.x - 10, q.y + 3], [q.x + 9, q.y - 4]], '#4a3020', 5);
    line(c, [[q.x - 8, q.y - 4], [q.x + 10, q.y + 3]], '#77472a', 4);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      oval(c, q.x + Math.cos(a) * 14, q.y + Math.sin(a) * 7, 4, 3, i % 2 ? '#a2a18a' : '#777f70');
    }
    for (let i = 0; i < 3; i++) {
      const x = q.x + (i - 1) * 5, f = Math.sin(g.time * (8 + i) + i) * 3;
      r.poly([[x - 5, q.y], [x - 2, q.y - 12], [x + 2, q.y - 20 - f], [x + 5, q.y], [x, q.y + 3]], i === 1 ? '#f7d08b' : '#e28e48');
      const rise = (g.time * 12 + i * 15) % 45;
      oval(c, q.x + Math.sin(rise * .12 + i) * 6, q.y - 12 - rise, 1, 1.5, '#eec17b88');
    }
  } else if (p.type === 'chest') {
    r.box(p.x, p.y, .58, 14, ['#ba9a59', '#685334', '#8b6d3d']);
    r.poly([[q.x - 14, q.y - 14], [q.x - 9, q.y - 20], [q.x + 3, q.y - 23], [q.x + 14, q.y - 15], [q.x, q.y - 8]], '#b69859', '#d4b579');
    for (const x of [-7, 7]) {
      line(c, [[q.x + x, q.y - 19], [q.x + x + 5, q.y - 12], [q.x + x + 5, q.y + 2]], '#485550', 3);
      oval(c, q.x + x + 5, q.y - 3, 1, 1, '#d0c6a5');
    }
    line(c, [[q.x - 13, q.y - 4], [q.x, q.y + 2], [q.x + 14, q.y - 5]], '#4c3d28');
    c.fillStyle = '#d1b576'; c.fillRect(q.x - 2, q.y - 9, 5, 7);
    oval(c, q.x + .5, q.y - 6, 1, 1.5, '#493d29');
    if (blocked(g, p)) { r.diamond(p.x, p.y, .8, '#883d6530', '#d388a7'); r.text(q.x, q.y - 30, 'Недоступно', '#e3a5b3', 9); }
  } else if (p.type === 'bed') {
    for (const dx of [-.4, .4]) for (const dy of [-.4, .4]) r.box(p.x + dx, p.y + dy, .09, 9, ['#b49c6c', '#584c32', '#7d6b47']);
    r.box(p.x, p.y, .76, 8, ['#a7976a', '#625538', '#80704a']);
    r.box(p.x, p.y, .63, 11, ['#9bafa0', '#718575', '#869b8a']);
    r.box(p.x - .24, p.y - .24, .25, 16, ['#ddcfab', '#aa9d7e', '#c8bc99']);
    for (let i = 0; i < 5; i++) line(c, [[q.x - 10 + i * 5, q.y - 9], [q.x - 5 + i * 5, q.y - 3]], '#cfbe9588');
    line(c, [[q.x - 16, q.y - 2], [q.x, q.y + 6], [q.x + 16, q.y - 2]], '#d5c9a3', 2);
  } else if (p.type === 'bench' || p.type === 'kitchen') {
    for (const dx of [-.33, .33]) for (const dy of [-.33, .33]) r.box(p.x + dx, p.y + dy, .1, 17, ['#af9662', '#514932', '#7c6b44']);
    r.box(p.x, p.y, .65, 20, ['#bea778', '#796743', '#978355']);
    line(c, [[q.x - 14, q.y - 20], [q.x, q.y - 13], [q.x + 14, q.y - 20]], '#6c573b');
    if (p.type === 'bench') {
      line(c, [[q.x - 9, q.y - 24], [q.x + 6, q.y - 15]], '#503f28', 3);
      r.poly([[q.x + 2, q.y - 24], [q.x + 10, q.y - 27], [q.x + 13, q.y - 19], [q.x + 6, q.y - 18]], '#b8c4b4', '#4b6258');
      line(c, [[q.x - 13, q.y - 18], [q.x - 3, q.y - 23]], '#d7c49a', 2);
      oval(c, q.x + 1, q.y - 20, 2, 1, '#dac395');
    } else {
      oval(c, q.x, q.y - 22, 11, 8, '#40564e');
      oval(c, q.x, q.y - 28, 11, 5, '#a6b1a1');
      oval(c, q.x, q.y - 28, 8, 3, '#8e914f');
      line(c, [[q.x - 12, q.y - 24], [q.x - 15, q.y - 28], [q.x - 11, q.y - 30]], '#a8b4a3', 2);
      line(c, [[q.x + 12, q.y - 24], [q.x + 15, q.y - 28], [q.x + 11, q.y - 30]], '#a8b4a3', 2);
      for (let i = 0; i < 3; i++) {
        const rise = (g.time * 7 + i * 10) % 30;
        oval(c, q.x + Math.sin(g.time + i) * 5, q.y - 30 - rise, 2 + rise / 10, 2, '#b9c9b22b');
      }
    }
  } else if (p.type === 'decor') {
    r.box(p.x, p.y, .27, 5, ['#b4a16c', '#655e3b', '#8c7a4d']);
    r.box(p.x, p.y, .17, 39, ['#c5af7b', '#6b6544', '#958354']);
    r.text(q.x, q.y - 13, 'ᚱ', '#e3d7a8', 16);
    line(c, [[q.x - 11, q.y - 36], [q.x + 12, q.y - 36]], '#bba36a', 3);
    const flutter = Math.sin(g.time * 2) * 2;
    r.poly([[q.x + 3, q.y - 36], [q.x + 13, q.y - 36], [q.x + 14 + flutter, q.y - 18], [q.x + 8, q.y - 22], [q.x + 4, q.y - 18]], '#7c9b80', '#afbea0');
  }
  if (p.hp < PARTS[p.type].hp) {
    if (p.hp / PARTS[p.type].hp < .65) line(c, [[q.x - 6, q.y - 22], [q.x + 1, q.y - 16], [q.x - 3, q.y - 9], [q.x + 6, q.y - 3]], '#2a3128', 2);
    c.fillStyle = '#12221c'; c.fillRect(q.x - 13, q.y + 12, 26, 3);
    c.fillStyle = '#c69a64'; c.fillRect(q.x - 13, q.y + 12, 26 * p.hp / PARTS[p.type].hp, 3);
  }
  c.restore();
}

function humanoid(r, actor, g, pose, player) {
  const c = r.ctx, heavy = actor.type === 'breaker';
  const cloth = player ? '#829c96' : heavy ? '#827451' : '#627566';
  const skin = player ? '#d6bd96' : '#9aa57d';
  c.save(); if (heavy) c.scale(1.28, 1.2);
  // Far arm and legs move in opposition; feet stay grounded at rest.
  line(c, [[-7, -24], [-13 - pose.step * 3, -17], [-10 - pose.step * 5, -12]], '#425447', 5);
  for (const side of [-1, 1]) {
    const stride = pose.step * side * 5;
    line(c, [[side * 4, -13], [side * 5 + stride * .45, -7], [side * 5 + stride, -1 - Math.max(0, stride) * .25]], '#3b4d43', 5);
    line(c, [[side * 5 + stride - 2, -1], [side * 5 + stride + 3, -1]], '#584c36', 4);
  }
  const sway = pose.step * 2;
  r.poly([[-9, -28], [5, -28], [10 + sway, -8], [-11 + sway, -5], [-13, -13]], player ? '#3c5b53' : '#3c5041', '#728571');
  r.poly([[-9, -27], [8, -27], [10, -12], [-9, -12]], actor.hurt > 0 ? '#ca9a87' : cloth, '#263f38');
  line(c, [[-8, -23], [6, -16]], '#c4b48a', 2);
  line(c, [[-8, -13], [9, -13]], '#54442e', 3);
  c.fillStyle = '#d0b574'; c.fillRect(-1, -15, 4, 4);
  if (player && g.player.inv.armor) {
    r.poly([[-8, -26], [7, -26], [5, -15], [-6, -15]], '#a68955', '#d0b77d');
    for (let i = -4; i < 6; i += 4) line(c, [[i, -24], [i, -17]], '#715c39');
  }
  oval(c, 0, -33, 6.5, 8, skin);
  r.poly([[-7, -34], [-6, -41], [4, -42], [8, -35], [3, -37]], player ? '#50695e' : '#485d43');
  if (player) { r.poly([[-4, -30], [6, -31], [3, -24], [-3, -26]], '#796346'); }
  else { line(c, [[-5, -38], [-11, -45]], '#a6a987', 2); line(c, [[4, -39], [10, -45]], '#a6a987', 2); }
  c.fillStyle = player ? '#273d37' : '#e1bd77'; c.fillRect(2, -34, 3, 2);
  if (player && g.player.weapon === 'bow' && g.player.inv.bow && !g.player.swing && !g.player.harvest) {
    const pull = pose.strike * 7;
    line(c, [[7, -25], [15, -23]], skin, 4);
    line(c, [[-4, -25], [10 - pull, -23]], skin, 3);
    c.strokeStyle = '#d1ad6d'; c.lineWidth = 2; c.beginPath(); c.arc(15, -23, 15, -1.4, 1.4); c.stroke();
    line(c, [[18, -38], [13 - pull, -23], [18, -8]], '#ddd4b0');
    line(c, [[11 - pull, -23], [31, -23]], '#d6c399');
  } else if (!player) {
    c.save(); c.translate(8, -25);
    const angle = pose.windup ? -.9 - pose.windup * 1.4 : pose.strike ? -1.8 + (1 - pose.strike) * 4 : .15 + pose.step * .25;
    c.rotate(angle);
    line(c, [[0, 0], [3, 7], [6, 11]], cloth, 5); oval(c, 6, 11, 3, 3, skin);
    if (!player || (g.player.weapon === 'sword' && g.player.inv.sword)) {
      line(c, [[6, 14], [6, -16]], heavy ? '#776341' : '#d4dfcc', heavy ? 6 : 3);
      line(c, [[1, 7], [11, 7]], '#bba16d', 2);
      if (heavy) r.poly([[1, -18], [12, -18], [15, -6], [1, -8]], '#95a18a', '#c3c7a0');
      else line(c, [[5, -15], [5, 3]], '#f3eed0');
    }
    c.restore();
  }
  if (player && g.player.blocking) {
    const glow = '#c5c8a0';
    r.poly([[-15, -28], [-6, -25], [-7, -14], [-14, -10], [-20, -19]], '#657e71', glow);
    line(c, [[-14, -25], [-14, -14]], glow, 2);
  }
  c.restore();
}

function wolf(r, pose) {
  const c = r.ctx;
  for (let i = 0; i < 4; i++) {
    const x = i < 2 ? -10 : 10, stride = pose.step * (i % 2 ? -1 : 1) * 7;
    line(c, [[x, -11], [x + stride * .5, -5], [x + stride, 1]], i % 2 ? '#728376' : '#4b6154', 3);
  }
  line(c, [[-15, -14], [-23, -19 + pose.step * 3], [-26, -15]], '#738777', 4);
  r.poly([[-16, -8], [-17, -18], [-7, -22], [3, -19], [10, -23], [16, -15], [12, -7], [-7, -6]], '#96a292', '#536c5b');
  r.poly([[-15, -17], [-11, -24], [-7, -21], [-3, -25], [2, -20], [8, -23], [11, -13]], '#bbc0a8');
  r.poly([[9, -20], [10, -30], [16, -23], [20, -19], [27, -15], [23, -11], [12, -12]], '#9fac98', '#667c66');
  r.poly([[11, -26], [12, -29], [15, -24]], '#596d58');
  oval(c, 24, -15, 3, 2, '#263e34'); oval(c, 17, -21, 1.5, 1.2, '#f0c880');
  const jaw = pose.strike * 5;
  line(c, [[15, -11], [23, -10 + jaw]], '#657a63', 3);
  if (pose.strike) line(c, [[20, -12], [20, -9]], '#f0e7c6', 2);
}

function guardian(r, actor, pose) {
  const c = r.ctx, glow = actor.hp < actor.maxHp * .5 ? '#efa875' : '#d4d38b';
  for (const side of [-1, 1]) {
    const stride = pose.step * side * 8;
    line(c, [[side * 10, -25], [side * 14 + stride * .5, -11], [side * 18 + stride, 0]], '#526449', 11);
    for (let i = -1; i <= 1; i++) line(c, [[side * 18 + stride, -2], [side * 18 + stride + i * 7, 5]], '#7d8960', 3);
  }
  r.poly([[-20, -57], [15, -60], [24, -28], [10, -15], [-17, -20], [-26, -35]], '#536849', '#87966b');
  for (let i = -2; i <= 2; i++) line(c, [[i * 7, -55], [i * 6 - 4, -42], [i * 7 + 2, -23]], '#a0a67666', 2);
  r.poly([[-12, -60], [-22, -83], [-20, -62], [-32, -75], [-23, -48], [-12, -40], [13, -40], [24, -53], [33, -82], [21, -65], [21, -91], [9, -62]], '#829768', '#adba86');
  oval(c, -6, -51, 3, 2, glow); oval(c, 7, -51, 3, 2, glow);
  r.poly([[-5, -36], [2, -41], [8, -32], [2, -25]], glow);
  for (const side of [-1, 1]) {
    c.save(); c.translate(side * 19, -47);
    c.rotate(side * (pose.windup * 2.2 - Math.sin(pose.strike * Math.PI) * .8 + pose.step * .12));
    line(c, [[0, 0], [side * 9, 14], [side * 7, 31]], '#4f6344', 9);
    line(c, [[0, 0], [side * 9, 14], [side * 7, 31]], '#859367', 2);
    for (let i = -1; i <= 1; i++) line(c, [[side * 7, 29], [side * 7 + i * 6, 38]], '#b0b38a', 3);
    c.restore();
  }
  oval(c, -20, -37, 7, 4, '#5f8151'); oval(c, 13, -24, 6, 3, '#789456');
}

export function drawActor(r, actor, g, player, pose) {
  if (actor.dead) return;
  const c = r.ctx, q = r.screen(actor.x, actor.y), boss = actor.type === 'boss';
  c.save();
  oval(c, q.x, q.y + 2, boss ? 46 : actor.type === 'wolf' ? 20 : 13, boss ? 10 : 5, '#071c1c66');
  if (!player && actor.phase === 'windup') {
    const radius = boss ? bossAttackSpec(actor.attackKind,actor.hp<actor.maxHp*.5).reach : ENEMY_REACH[actor.type];
    c.fillStyle = '#bd664335'; c.strokeStyle = '#e7ad6b99'; c.lineWidth = 1;
    c.beginPath();
    if(boss&&actor.attackKind==='swipe'){
      const aim=aimAngle({x:actor.attackFacingX,y:actor.attackFacingY}),spread=Math.acos(.3);
      c.moveTo(q.x,q.y);for(let i=0;i<=24;i++){const angle=aim-spread+spread*2*i/24,v=fromPlane(Math.cos(angle)*radius,Math.sin(angle)*radius),point=r.screen(actor.x+v.x,actor.y+v.y);c.lineTo(point.x,point.y);}c.closePath();
    }else c.ellipse(q.x, q.y, r.scale * (boss&&actor.attackKind==='ranged'?1.2:radius) * Math.SQRT2, r.scale * (boss&&actor.attackKind==='ranged'?1.2:radius) / Math.SQRT2, 0, 0, Math.PI * 2);
    c.fill(); c.stroke();
    if(boss&&actor.attackKind==='ranged'){
      const n=Math.max(.001,distance({x:0,y:0},{x:actor.attackFacingX,y:actor.attackFacingY})),end=r.screen(actor.x+actor.attackFacingX/n*16,actor.y+actor.attackFacingY/n*16);
      line(c,[[q.x,q.y],[end.x,end.y]],'#e6bf8277',3);
    }
    c.strokeStyle = '#f1b177'; c.lineWidth = 2; c.beginPath();
    c.arc(q.x, q.y - (boss ? 185 : 63), 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pose.windup); c.stroke();
  }
  c.save(); c.translate(q.x + pose.lunge * pose.facing, q.y + pose.bob); c.scale(pose.facing*(boss?1.85:1.3),boss?1.85:1.3);
  if (actor.type === 'wolf') wolf(r, pose);
  else if (boss) guardian(r, actor, pose);
  else humanoid(r, actor, g, pose, player);
  if (pose.strike && !player) {
    c.strokeStyle = boss ? '#d7b97899' : player ? '#e8eac7aa' : '#dba77699';
    c.lineWidth = boss ? 4 : 2; c.beginPath();
    c.arc(8, boss ? -34 : -23, boss ? 40 : 23, -.8 + (1 - pose.strike) * 2, .3 + (1 - pose.strike) * 2); c.stroke();
  }
  c.restore();
  if(player){if(actor.harvest)drawGatherTool(r,actor,g,pose);else drawMelee(r,actor,g,pose);}
  if (!player && actor.hp < actor.maxHp && !boss) {
    c.fillStyle = '#13281d'; c.fillRect(q.x - 15, q.y - 70, 30, 3);
    c.fillStyle = '#bf8267'; c.fillRect(q.x - 15, q.y - 70, 30 * actor.hp / actor.maxHp, 3);
  }
  if (actor.stun > 0) r.text(q.x, q.y - (boss ? 190 : 76), '✧', '#d9df9b', 20);
  c.restore();
}

function drawMelee(r,actor,g,pose) {
  const swing=swingPose(actor.swing,g.time),weapon=swing?actor.swing.weapon:actor.inv[actor.weapon]?actor.weapon:'hands';if(weapon==='bow')return;
  const angle=swing?swing.angle:aimAngle(actor.facing)-.7,reach=MELEE[weapon].reach;
  const lift=swing?.phase==='windup'?Math.sin(swing.age/MELEE[weapon].windup*Math.PI)*8:0;
  const z=29+lift,q=r.screen(actor.x,actor.y),[u,v]=bladeSegment(actor,angle,reach),a=r.screen(u.x,u.y,z),b=r.screen(v.x,v.y,z);
  const c=r.ctx;c.save();
  line(c,[[q.x+7*pose.facing,q.y-31],[a.x,a.y]],'#9aaf9c',5);
  if(weapon==='sword'){
    line(c,[[a.x,a.y],[b.x,b.y]],'#53665c',5);
    line(c,[[a.x,a.y],[b.x,b.y]],'#e0e6d0',3);
    const len=Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),dx=(b.x-a.x)/len,dy=(b.y-a.y)/len;
    line(c,[[a.x-dy*5,a.y+dx*5],[a.x+dy*5,a.y-dx*5]],'#d1b477',2);
  }else oval(c,b.x,b.y,4,4,'#dbc29b');
  oval(c,a.x,a.y,3,3,'#d4ba93');
  if(swing?.phase==='active'){
    const points=[];for(let i=0;i<=6;i++){
      const theta=Math.max(actor.swing.angle-.8,angle-.3+i*.05),tip=bladeSegment(actor,theta,reach)[1],p=r.screen(tip.x,tip.y,z);
      points.push([p.x,p.y]);
    }
    line(c,points,'#eae5c588',2);
  }
  c.restore();
}

function drawGatherTool(r,actor,g,pose){
  const c=r.ctx,q=r.screen(actor.x,actor.y),age=g.time-actor.harvest.started;
  const angle=age<.12?-.4-age/.12*2.4:age<.22?-2.8+(age-.12)/.1*2.6:-.2+(age-.22)/.33*.3;
  c.save();c.translate(q.x+8*pose.facing,q.y-30);c.scale(pose.facing,1);c.rotate(angle);
  line(c,[[0,0],[25,0]],'#5e472e',6);line(c,[[0,-1],[25,-1]],'#c3a577',3);
  for(let i=0;i<4;i++)line(c,[[i*3,-3],[i*3+2,3]],'#72563c',1);
  if(actor.harvest.type==='wood'){r.poly([[20,-4],[31,-10],[35,-7],[33,7],[28,9],[20,3]],'#9eafa7','#536c6b');line(c,[[31,-10],[35,-7],[33,7],[28,9]],'#e3e4cf',2);line(c,[[22,-3],[28,-3],[27,3]],'#627b76');oval(c,22,0,1,1,'#d9c395');}
  else line(c,[[20,-10],[27,-4],[28,4],[24,10]],'#c1ccc3',4);
  oval(c,1,0,4,4,'#d9bd92');c.restore();
}
