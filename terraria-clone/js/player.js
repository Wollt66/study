class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 18; this.h = 42;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.health = CONFIG.MAX_HEALTH;
    this.maxHealth = CONFIG.MAX_HEALTH;
    this.inventory = new Inventory(40);
    this.dead = false;
    this.mineTarget = null;
    this.mineProgress = 0;
    this.attackCooldown = 0;
    this.hurtCooldown = 0;
    this.spawnX = x; this.spawnY = y;
  }

  update(dt, world, input, enemies) {
    if (this.dead) return;
    const k = input.keys;
    let moveX = 0;
    if (k['a'] || k['arrowleft']) moveX -= 1;
    if (k['d'] || k['arrowright']) moveX += 1;
    if (moveX !== 0) {
      this.vx = moveX * CONFIG.MOVE_SPEED * (this.onGround ? 1 : CONFIG.AIR_CONTROL);
      this.facing = moveX;
    } else {
      this.vx *= CONFIG.FRICTION;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }
    if ((k['w'] || k[' '] || k['arrowup']) && this.onGround) {
      this.vy = CONFIG.JUMP_VEL;
      this.onGround = false;
    }
    this.vy += CONFIG.GRAVITY;
    if (this.vy > CONFIG.MAX_FALL) this.vy = CONFIG.MAX_FALL;

    this.x += this.vx;
    this._collideX(world);
    const prevY = this.y;
    this.y += this.vy;
    this.onGround = false;
    this._collideY(world, prevY);

    if (this.y > world.h * CONFIG.TILE + 200) this.takeDamage(999);

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.hurtCooldown > 0) this.hurtCooldown -= dt;

    this._handleMining(dt, world, input);
    this._handleAttack(input, enemies);
  }

  _collideX(world) {
    if (world.checkAABB(this.x, this.y, this.w, this.h)) {
      if (this.vx > 0) this.x = Math.floor((this.x + this.w) / CONFIG.TILE) * CONFIG.TILE - this.w - 0.01;
      else if (this.vx < 0) this.x = Math.ceil(this.x / CONFIG.TILE) * CONFIG.TILE + 0.01;
      this.vx = 0;
    }
  }

  _collideY(world, prevY) {
    if (world.checkAABB(this.x, this.y, this.w, this.h)) {
      if (this.vy > 0) {
        this.y = Math.floor((this.y + this.h) / CONFIG.TILE) * CONFIG.TILE - this.h - 0.01;
        this.onGround = true;
      } else if (this.vy < 0) {
        this.y = Math.ceil(this.y / CONFIG.TILE) * CONFIG.TILE + 0.01;
      }
      this.vy = 0;
    }
    if (!this.onGround && world.checkPlatformCollision(this.x, this.y + this.h, this.w, prevY + this.h)) {
      this.y = Math.floor((this.y + this.h) / CONFIG.TILE) * CONFIG.TILE - this.h - 0.01;
      this.vy = 0;
      this.onGround = true;
    }
  }

  getCenter() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }

  getReachTarget(input, camera) {
    const mx = input.mouseX + camera.x;
    const my = input.mouseY + camera.y;
    const c = this.getCenter();
    const dx = mx - c.x, dy = my - c.y;
    if (Math.sqrt(dx * dx + dy * dy) > CONFIG.REACH * CONFIG.TILE) return null;
    return { tx: Math.floor(mx / CONFIG.TILE), ty: Math.floor(my / CONFIG.TILE) };
  }

  _handleMining(dt, world, input) {
    if (!input.mouseDown) { this.mineTarget = null; this.mineProgress = 0; return; }
    const target = this.getReachTarget(input, input.camera);
    if (!target) { this.mineTarget = null; this.mineProgress = 0; return; }
    const blockId = world.get(target.tx, target.ty);
    if (blockId === B.AIR || blockId === B.BEDROCK) { this.mineTarget = null; this.mineProgress = 0; return; }

    const key = target.tx + ',' + target.ty;
    if (this.mineTarget !== key) { this.mineTarget = key; this.mineProgress = 0; }

    const block = BLOCKS[blockId];
    const sel = this.inventory.getSelected();
    const item = sel ? ITEMS[sel.itemId] : null;

    if (item && item.tool === 'sword') { this.mineProgress = 0; return; }
    if (!canMine(item, blockId)) { this.mineProgress = 0; return; }

    const speed = getToolSpeed(item, blockId);
    this.mineProgress += dt * speed * CONFIG.MINE_SPEED * 10;
    if (this.mineProgress >= block.hardness * 10) {
      world.set(target.tx, target.ty, B.AIR);
      if (block.drop) this.inventory.add(block.drop, 1);
      this.mineTarget = null; this.mineProgress = 0;
    }
  }

  _handleAttack(input, enemies) {
    if (!input.mouseDown || this.attackCooldown > 0) return;
    const target = this.getReachTarget(input, input.camera);
    if (!target) return;
    const sel = this.inventory.getSelected();
    const item = sel ? ITEMS[sel.itemId] : null;
    const damage = (item && item.damage) ? item.damage : 3;
    const px = this.getCenter().x, py = this.getCenter().y;
    let hit = false;
    for (const e of enemies) {
      if (e.dead) continue;
      const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
      const dist = Math.sqrt((ex - px) ** 2 + (ey - py) ** 2);
      if (dist < CONFIG.TILE * 2.5) {
        e.takeDamage(damage, this.facing);
        hit = true;
      }
    }
    if (hit) this.attackCooldown = 0.35;
  }

  placeBlock(world, input) {
    const target = this.getReachTarget(input, input.camera);
    if (!target) return false;
    if (world.get(target.tx, target.ty) !== B.AIR) return false;
    const bx = target.tx * CONFIG.TILE, by = target.ty * CONFIG.TILE;
    if (this.x < bx + CONFIG.TILE && this.x + this.w > bx && this.y < by + CONFIG.TILE && this.y + this.h > by) return false;
    const sel = this.inventory.getSelected();
    if (!sel) return false;
    const item = ITEMS[sel.itemId];
    if (!item || !item.place) return false;
    world.set(target.tx, target.ty, item.place);
    this.inventory.removeFromSelected(1);
    return true;
  }

  takeDamage(dmg, dir) {
    if (this.dead || this.hurtCooldown > 0) return;
    this.health -= dmg;
    this.hurtCooldown = 0.5;
    if (dir) { this.vx = dir * 5; this.vy = -5; }
    if (this.health <= 0) { this.health = 0; this.dead = true; }
  }

  respawn() {
    this.x = this.spawnX; this.y = this.spawnY;
    this.vx = 0; this.vy = 0;
    this.health = this.maxHealth;
    this.dead = false;
    this.hurtCooldown = 0;
  }

  eatFood() {
    const sel = this.inventory.getSelected();
    if (!sel) return false;
    const item = ITEMS[sel.itemId];
    if (!item || !item.food) return false;
    if (this.health >= this.maxHealth) return false;
    this.health = Math.min(this.maxHealth, this.health + item.food);
    this.inventory.removeFromSelected(1);
    return true;
  }

  isNearWorkbench(world) {
    const c = this.getCenter();
    const cx = Math.floor(c.x / CONFIG.TILE);
    const cy = Math.floor(c.y / CONFIG.TILE);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (world.get(cx + dx, cy + dy) === B.WORKBENCH) return true;
      }
    }
    return false;
  }
}