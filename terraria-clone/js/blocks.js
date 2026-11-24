const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAF: 5, SAND: 6,
  IRON_ORE: 8, GOLD_ORE: 9, DIAMOND_ORE: 10, COAL_ORE: 11,
  PLANK: 12, STONE_BRICK: 13, GLASS: 14, TORCH: 15, WORKBENCH: 16,
  BEDROCK: 17, SNOW: 18, PLATFORM: 19,
};

const BLOCKS = {};
BLOCKS[B.AIR]         = { name:'空气', solid:false, transparent:true };
BLOCKS[B.GRASS]       = { name:'草地', solid:true, hardness:0.6, drop:'dirt', color:'#4a7c3a', top:'#5a9c4a' };
BLOCKS[B.DIRT]        = { name:'泥土', solid:true, hardness:0.6, drop:'dirt', color:'#6b4a2b' };
BLOCKS[B.STONE]       = { name:'石头', solid:true, hardness:1.5, drop:'stone', color:'#6a6a6a' };
BLOCKS[B.WOOD]        = { name:'木头', solid:true, hardness:1.0, drop:'wood', color:'#7a5a2a' };
BLOCKS[B.LEAF]        = { name:'树叶', solid:false, transparent:true, hardness:0.2, drop:null, color:'#3a6a2a' };
BLOCKS[B.SAND]        = { name:'沙子', solid:true, hardness:0.5, drop:'sand', color:'#d4c080' };
BLOCKS[B.IRON_ORE]    = { name:'铁矿', solid:true, hardness:2.5, drop:'iron_ore', color:'#6a6a6a', oreColor:'#c8a878' };
BLOCKS[B.GOLD_ORE]    = { name:'金矿', solid:true, hardness:3.0, drop:'gold_ore', color:'#6a6a6a', oreColor:'#f0d040' };
BLOCKS[B.DIAMOND_ORE] = { name:'钻石矿', solid:true, hardness:4.0, drop:'diamond', color:'#6a6a6a', oreColor:'#60e0e0' };
BLOCKS[B.COAL_ORE]    = { name:'煤矿', solid:true, hardness:2.0, drop:'coal', color:'#6a6a6a', oreColor:'#2a2a2a' };
BLOCKS[B.PLANK]       = { name:'木板', solid:true, hardness:1.0, drop:'plank', color:'#a08040' };
BLOCKS[B.STONE_BRICK] = { name:'石砖', solid:true, hardness:1.5, drop:'stone_brick', color:'#787878' };
BLOCKS[B.GLASS]       = { name:'玻璃', solid:true, transparent:true, hardness:0.3, drop:'glass', color:'#a0d0e0' };
BLOCKS[B.TORCH]       = { name:'火把', solid:false, transparent:true, light:7, drop:'torch', color:'#ff8030' };
BLOCKS[B.WORKBENCH]   = { name:'工作台', solid:true, hardness:1.5, drop:'workbench', color:'#8a6a3a' };
BLOCKS[B.BEDROCK]     = { name:'基岩', solid:true, hardness:999, drop:null, color:'#2a2a2a' };
BLOCKS[B.SNOW]        = { name:'雪块', solid:true, hardness:0.4, drop:'snow', color:'#e0e8f0' };
BLOCKS[B.PLATFORM]    = { name:'木平台', solid:false, platform:true, hardness:0.8, drop:'platform', color:'#a08040' };

function isSolid(id) { const b = BLOCKS[id]; return b && b.solid; }
function isTransparent(id) { const b = BLOCKS[id]; return !b || b.transparent; }
function isPlatform(id) { const b = BLOCKS[id]; return b && b.platform; }
function getLight(id) { const b = BLOCKS[id]; return b ? (b.light || 0) : 0; }