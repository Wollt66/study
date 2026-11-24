const ITEMS = {
  dirt:        { name:'泥土', icon:'🟫', stack:99, place:B.DIRT },
  stone:       { name:'石头', icon:'⬜', stack:99, place:B.STONE },
  wood:        { name:'木头', icon:'🟧', stack:99, place:B.WOOD },
  plank:       { name:'木板', icon:'🟨', stack:99, place:B.PLANK },
  stone_brick: { name:'石砖', icon:'⬛', stack:99, place:B.STONE_BRICK },
  glass:       { name:'玻璃', icon:'🔷', stack:99, place:B.GLASS },
  sand:        { name:'沙子', icon:'🟨', stack:99, place:B.SAND },
  snow:        { name:'雪', icon:'⬜', stack:99, place:B.SNOW },
  platform:    { name:'木平台', icon:'▬', stack:99, place:B.PLATFORM },
  torch:       { name:'火把', icon:'🔥', stack:99, place:B.TORCH },
  workbench:   { name:'工作台', icon:'🔨', stack:99, place:B.WORKBENCH },
  iron_ore:    { name:'铁矿石', icon:'🟤', stack:99 },
  gold_ore:    { name:'金矿石', icon:'🟡', stack:99 },
  coal:        { name:'煤炭', icon:'⚫', stack:99 },
  diamond:     { name:'钻石', icon:'💎', stack:99 },
  stick:       { name:'木棍', icon:'/', stack:99 },
  wood_pick:   { name:'木镐', icon:'⛏', stack:1, tool:'pickaxe', level:1, speed:1.8, damage:5 },
  stone_pick:  { name:'石镐', icon:'⛏', stack:1, tool:'pickaxe', level:2, speed:3.0, damage:8 },
  iron_pick:   { name:'铁镐', icon:'⛏', stack:1, tool:'pickaxe', level:3, speed:5.0, damage:12 },
  diamond_pick:{ name:'钻石镐', icon:'⛏', stack:1, tool:'pickaxe', level:4, speed:8.0, damage:16 },
  wood_axe:    { name:'木斧', icon:'🪓', stack:1, tool:'axe', level:1, speed:1.8, damage:6 },
  stone_axe:   { name:'石斧', icon:'🪓', stack:1, tool:'axe', level:2, speed:3.0, damage:10 },
  iron_axe:    { name:'铁斧', icon:'🪓', stack:1, tool:'axe', level:3, speed:5.0, damage:15 },
  wood_sword:  { name:'木剑', icon:'🗡', stack:1, tool:'sword', level:1, damage:10 },
  stone_sword: { name:'石剑', icon:'🗡', stack:1, tool:'sword', level:2, damage:18 },
  iron_sword:  { name:'铁剑', icon:'🗡', stack:1, tool:'sword', level:3, damage:28 },
  diamond_sword:{name:'钻石剑', icon:'🗡', stack:1, tool:'sword', level:4, damage:45 },
  iron_ingot:  { name:'铁锭', icon:'🔩', stack:99 },
  gold_ingot:  { name:'金锭', icon:'🟡', stack:99 },
  apple:       { name:'苹果', icon:'🍎', stack:99, food:25 },
};

function getItem(id) { return ITEMS[id]; }
function isTool(id) { const it = ITEMS[id]; return it && it.tool; }
function getToolSpeed(item, blockId) {
  if (!item || !item.tool) return 1;
  const block = BLOCKS[blockId];
  if (!block || !block.hardness) return 1;
  if (item.tool === 'pickaxe' && blockId >= B.STONE && blockId <= B.DIAMOND_ORE) return item.speed;
  if (item.tool === 'axe' && (blockId === B.WOOD || blockId === B.PLANK)) return item.speed;
  return item.tool === 'sword' ? 1.5 : 1;
}
function canMine(item, blockId) {
  const block = BLOCKS[blockId];
  if (!block || !block.hardness || block.hardness >= 999) return false;
  if (!item || !item.tool) return true;
  const reqLevel = blockId === B.DIAMOND_ORE ? 3 : blockId === B.GOLD_ORE ? 3 : blockId === B.IRON_ORE ? 2 : 1;
  return item.level >= reqLevel;
}