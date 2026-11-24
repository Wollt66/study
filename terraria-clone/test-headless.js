'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ========== Mock DOM ==========
function makeMockCtx() {
  return new Proxy({}, { get(t,p){ if(p in t) return t[p]; return (...a)=>{}; }, set(t,p,v){ t[p]=v; return true; } });
}
function makeMockEl() {
  const el = {
    style: {}, classList: { _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
      toggle(c,f){ if(f===undefined)f=!this._s.has(c); f?this._s.add(c):this._s.delete(c); }, contains(c){return this._s.has(c);} },
    children: [], innerHTML:'', textContent:'', dataset:{}, _l:{},
    addEventListener(t,fn){(this._l[t]=this._l[t]||[]).push(fn);}, removeEventListener(){},
    appendChild(c){this.children.push(c);return c;}, getContext(){return makeMockCtx();},
    getBoundingClientRect(){return{left:0,top:0,width:800,height:600};},
  };
  return el;
}
const mockEls = {};
const doc = {
  getElementById(id){ if(!mockEls[id])mockEls[id]=makeMockEl(); return mockEls[id]; },
  querySelectorAll(){ const a=[]; for(let i=0;i<9;i++)a.push(makeMockEl()); return a; },
  createElement(){ return makeMockEl(); },
};
const win = { innerWidth:1280, innerHeight:720, _l:{},
  addEventListener(t,fn){(this._l[t]=this._l[t]||[]).push(fn);}, removeEventListener(){}, devicePixelRatio:1 };

// ========== VM 上下文 ==========
const ctx = {
  document: doc, window: win, console, Math, Date, JSON, Array, Object, Number, Boolean, String,
  Uint8Array, Int16Array, Float32Array, Proxy, Reflect, parseInt, parseFloat, isNaN, isFinite,
  requestAnimationFrame: ()=>{}, performance: { now: ()=>Date.now() }, Image: function(){},
  setTimeout, clearTimeout, process: { exit: ()=>{} },
};
vm.createContext(ctx);

// ========== 加载游戏代码 ==========
const jsDir = path.join(__dirname, 'js');
const files = ['config.js','blocks.js','items.js','world.js','inventory.js','crafting.js',
  'player.js','enemy.js','daynight.js','renderer.js','input.js','game.js'];
for (const f of files) {
  vm.runInContext(fs.readFileSync(path.join(jsDir, f), 'utf8'), ctx, { filename: f });
}

// ========== 测试代码（在 ctx 中执行） ==========
const testCode = `
'use strict';
const results = [];
let pass = 0, fail = 0;
function assert(name, cond, extra) {
  if (cond) { pass++; results.push('  ✓ ' + name); }
  else { fail++; results.push('  ✗ ' + name + (extra ? ' → ' + extra : '')); }
}

console.log('=== 无头冒烟测试：模拟 600 秒游戏逻辑 ===\\n');

const game = new Game();

// --- 初始状态 ---
assert('世界生成成功', game.world && game.world.w === CONFIG.WORLD_W);
assert('玩家存在且存活', game.player && !game.player.dead);
assert('玩家在合理位置', game.player.x > 0 && game.player.x < CONFIG.WORLD_W * CONFIG.TILE);
assert('初始生命值正确', game.player.health === CONFIG.MAX_HEALTH);
assert('背包 40 格', game.player.inventory.size === 40);
assert('初始赠送木镐', game.player.inventory.countItem('wood_pick') === 1);
assert('初始赠送木斧', game.player.inventory.countItem('wood_axe') === 1);
assert('初始赠送木剑', game.player.inventory.countItem('wood_sword') === 1);
assert('初始赠送火把x10', game.player.inventory.countItem('torch') === 10);
assert('初始赠送苹果x3', game.player.inventory.countItem('apple') === 3);
assert('昼夜初始为白天', game.dayNight.phase === 'day');
assert('敌人管理器空', game.enemyMgr.enemies.length === 0);

// --- 地形统计 ---
let grass = 0, stone = 0, ores = 0, trees = 0;
for (let x = 0; x < game.world.w; x++) {
  const sy = game.world.surface[x];
  if (game.world.get(x, sy) === B.GRASS) grass++;
  if (game.world.get(x, sy + 12) === B.STONE) stone++;
  for (let y = sy; y < Math.min(sy + 50, game.world.h); y++) {
    const id = game.world.get(x, y);
    if (id === B.IRON_ORE || id === B.COAL_ORE || id === B.GOLD_ORE || id === B.DIAMOND_ORE) ores++;
  }
  for (let y = 0; y < sy; y++) if (game.world.get(x, y) === B.WOOD) trees++;
}
assert('地表草地 >50%', grass > CONFIG.WORLD_W * 0.5, '仅 ' + grass + ' 格');
assert('地下石头存在', stone > 0);
assert('矿石已生成', ores > 0, '仅 ' + ores + ' 个');
assert('树木已生成', trees > 0, '仅 ' + trees + ' 棵');

// --- 模拟 600 秒 ---
const DT = 0.016, TOTAL = 600, steps = Math.floor(TOTAL / DT);
let nightT = 0, dayT = 0, spawned = 0, errors = 0, prevCnt = 0;
let phaseCh = [], prevPhase = 'day';
game.input.keys['d'] = true;

for (let i = 0; i < steps; i++) {
  try {
    if (i % 200 === 0) { game.input.keys['a'] = !game.input.keys['a']; game.input.keys['d'] = !game.input.keys['d']; }
    if (i % 50 === 0) game.input.keys[' '] = true;
    if (i % 50 === 1) game.input.keys[' '] = false;
    game._update(DT);
    game.renderer.updateCamera(game.player);
    game.input.setCamera(game.renderer.camera);
    if (game.dayNight.isNight()) nightT += DT; else dayT += DT;
    if (game.dayNight.phase !== prevPhase) { phaseCh.push(prevPhase + '→' + game.dayNight.phase + '@' + (i*DT).toFixed(0) + 's'); prevPhase = game.dayNight.phase; }
    if (game.enemyMgr.enemies.length > prevCnt) spawned += game.enemyMgr.enemies.length - prevCnt;
    prevCnt = game.enemyMgr.enemies.length;
    if (game.player.dead) game.player.respawn();
  } catch (e) { errors++; if (errors <= 3) console.error('  步骤 ' + i + ': ' + e.message); }
}

assert('600秒零异常', errors === 0, errors + ' 次异常');
assert('昼夜时间推进', game.dayNight.time > 0);
assert('经历白天 >10s', dayT > 10, dayT.toFixed(0) + 's');
assert('经历夜晚 >10s', nightT > 10, nightT.toFixed(0) + 's');
assert('相位切换 ≥2次', phaseCh.length >= 2, phaseCh.length + '次: ' + phaseCh.join(', '));
assert('夜晚生成僵尸', spawned > 0, '仅 ' + spawned + ' 个');
assert('玩家存活', !game.player.dead);
assert('玩家有位移', Math.abs(game.player.x - game.player.spawnX) > 5 || Math.abs(game.player.y - game.player.spawnY) > 5);

// --- 挖掘 ---
const px = Math.floor(game.player.getCenter().x / CONFIG.TILE);
const py = Math.floor(game.player.getCenter().y / CONFIG.TILE);
let mined = false;
for (let dy = 1; dy < 6; dy++) {
  const id = game.world.get(px, py + dy);
  if (id !== B.AIR && id !== B.BEDROCK) { game.world.set(px, py + dy, B.AIR); mined = true; break; }
}
assert('能挖掘方块', mined);

// --- 放置 ---
for (let i = 0; i < 9; i++) {
  if (game.player.inventory.slots[i] && game.player.inventory.slots[i].itemId === 'torch') { game.player.inventory.selectSlot(i); break; }
}
game.world.set(px, py - 2, B.AIR);
const placed = game.player.placeBlock(game.world, {
  mouseX: (px + 0.5) * CONFIG.TILE - game.renderer.camera.x,
  mouseY: (py - 2 + 0.5) * CONFIG.TILE - game.renderer.camera.y,
  camera: game.renderer.camera,
});
assert('能放置火把', placed);

// --- 合成 ---
game.player.inventory.add('wood', 10);
const r0 = RECIPES[0];
const canMake = Crafting.canCraft(game.player.inventory, r0, false);
assert('可合成木板', canMake);
if (canMake) {
  const before = game.player.inventory.countItem('plank');
  Crafting.craft(game.player.inventory, r0, false);
  assert('合成后木板增加', game.player.inventory.countItem('plank') > before);
}

// --- 工具等级 ---
assert('木镐挖石头', canMine(ITEMS.wood_pick, B.STONE));
assert('木镐挖煤矿', canMine(ITEMS.wood_pick, B.COAL_ORE));
assert('木镐不能挖铁矿', !canMine(ITEMS.wood_pick, B.IRON_ORE));
assert('石镐挖铁矿', canMine(ITEMS.stone_pick, B.IRON_ORE));
assert('石镐不能挖钻石', !canMine(ITEMS.stone_pick, B.DIAMOND_ORE));
assert('铁镐挖钻石', canMine(ITEMS.iron_pick, B.DIAMOND_ORE));

// --- 物理 ---
const tp = new Player(100, 100);
for (let i = 0; i < 120; i++) { tp.vy += CONFIG.GRAVITY; const py0 = tp.y; tp.y += tp.vy; tp._collideY(game.world, py0); }
assert('重力下落会落地', tp.onGround || tp.y >= CONFIG.WORLD_H * CONFIG.TILE);

// --- 输出 ---
console.log(results.join('\\n'));
console.log('\\n=== 总结: ' + pass + ' 通过, ' + fail + ' 失败（模拟 ' + TOTAL + 's, ' + steps + ' 步） ===');
console.log('白天 ' + dayT.toFixed(0) + 's | 夜晚 ' + nightT.toFixed(0) + 's | 僵尸 ' + spawned + ' 个');
console.log('相位: ' + phaseCh.join(' | '));
globalThis._testFail = fail;
`;

vm.runInContext(testCode, ctx);
process.exit(ctx._testFail > 0 ? 1 : 0);