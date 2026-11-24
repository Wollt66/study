const RECIPES = [
  { result:{itemId:'plank', count:4}, ingredients:[{itemId:'wood', count:1}], needsWorkbench:false },
  { result:{itemId:'stick', count:4}, ingredients:[{itemId:'plank', count:2}], needsWorkbench:false },
  { result:{itemId:'torch', count:4}, ingredients:[{itemId:'coal', count:1},{itemId:'stick', count:1}], needsWorkbench:false },
  { result:{itemId:'workbench', count:1}, ingredients:[{itemId:'plank', count:10}], needsWorkbench:false },
  { result:{itemId:'platform', count:2}, ingredients:[{itemId:'plank', count:1}], needsWorkbench:true },
  { result:{itemId:'wood_pick', count:1}, ingredients:[{itemId:'plank', count:3},{itemId:'stick', count:2}], needsWorkbench:true },
  { result:{itemId:'wood_axe', count:1}, ingredients:[{itemId:'plank', count:3},{itemId:'stick', count:2}], needsWorkbench:true },
  { result:{itemId:'wood_sword', count:1}, ingredients:[{itemId:'plank', count:2},{itemId:'stick', count:1}], needsWorkbench:true },
  { result:{itemId:'stone_pick', count:1}, ingredients:[{itemId:'stone', count:3},{itemId:'stick', count:2}], needsWorkbench:true },
  { result:{itemId:'stone_axe', count:1}, ingredients:[{itemId:'stone', count:3},{itemId:'stick', count:2}], needsWorkbench:true },
  { result:{itemId:'stone_sword', count:1}, ingredients:[{itemId:'stone', count:2},{itemId:'stick', count:1}], needsWorkbench:true },
  { result:{itemId:'stone_brick', count:4}, ingredients:[{itemId:'stone', count:4}], needsWorkbench:true },
  { result:{itemId:'glass', count:2}, ingredients:[{itemId:'sand', count:1},{itemId:'coal', count:1}], needsWorkbench:true },
  { result:{itemId:'iron_ingot', count:1}, ingredients:[{itemId:'iron_ore', count:1},{itemId:'coal', count:1}], needsWorkbench:true },
  { result:{itemId:'gold_ingot', count:1}, ingredients:[{itemId:'gold_ore', count:1},{itemId:'coal', count:1}], needsWorkbench:true },
  { result:{itemId:'iron_pick', count:1}, ingredients:[{itemId:'iron_ingot', count:3},{itemId:'stick', count:2}], needsWorkbench:true },
  { result:{itemId:'iron_axe', count:1}, ingredients:[{itemId:'iron_ingot', count:3},{itemId:'stick', count:2}], needsWorkbench:true },
  { result:{itemId:'iron_sword', count:1}, ingredients:[{itemId:'iron_ingot', count:2},{itemId:'stick', count:1}], needsWorkbench:true },
  { result:{itemId:'diamond_pick', count:1}, ingredients:[{itemId:'diamond', count:3},{itemId:'stick', count:2}], needsWorkbench:true },
  { result:{itemId:'diamond_sword', count:1}, ingredients:[{itemId:'diamond', count:2},{itemId:'stick', count:1}], needsWorkbench:true },
];

const Crafting = {
  canCraft(inv, recipe, nearWorkbench) {
    if (recipe.needsWorkbench && !nearWorkbench) return false;
    for (const ing of recipe.ingredients) {
      if (!inv.hasItem(ing.itemId, ing.count)) return false;
    }
    return true;
  },

  craft(inv, recipe, nearWorkbench) {
    if (!this.canCraft(inv, recipe, nearWorkbench)) return false;
    for (const ing of recipe.ingredients) inv.remove(ing.itemId, ing.count);
    inv.add(recipe.result.itemId, recipe.result.count);
    return true;
  },

  getAvailable(inv, nearWorkbench) {
    return RECIPES.filter(r => this.canCraft(inv, r, nearWorkbench));
  }
};