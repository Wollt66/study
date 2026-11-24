class Zombie {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 20; this.h = 40;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.health = 30;
    this.maxHealth = 30;
    this.dead = false;
    this.facing = -1;
    this.attackCD = 0;
    this.hurtCD = 0;
    this.burning = false;
    this.burnTimer = 0;
  }

  update(dt, world, player) {
    if (this.dead) return;
    const pc = player.getCenter();
    const my = this.y + this.h / 2;
    const mx = this.x + this.w / 2;
    const dx = pc.x - mx;
    const dist = Math.abs(dx);
    this.facing = dx > 0 ? 1 : -1;

    if (dist > CONFIG.TILE * 1.2) {
      this.vx = this.facing * 1.6;
    } else {
      this.vx *= 0.8;
      if (this.attackCD <= 0 && !player.dead) {
        player.takeDamage(8, this.facing);
        this.attackCD = 1.0;
      }
    }
    if (this.attackCD > 0) this.attackCD -= dt;
    if (this.hurtCD > 0) this.hurtCD -= dt;

    if (this.onGround && this._blockedAhead(world)) this.vy = CONFIG.JUMP_VEL * 0.8;

    this.vy += CONFIG.GRAVITY;
    if (this.vy > CONFIG.MAX_FALL) this.vy = CONFIG.MAX_FALL;

    this.x += this.vx;
    this._collideX(world);
    const prevY = this.y;
    this.y += this.vy;
    this.onGround = false;
    this._collideY(world, prevY);

    if (this.burning) {
      this.burnTimer -= dt;
      this.health -= dt * 6;
      if (this.burnTimer <= 0) this.burning = false;
      if (this.health <= 0) this.dead = true;
    }
  }

  _blockedAhead(world) {
    const checkX = this.facing > 0 ? this.x + this.w + 2 : this.x - 2;
    const ty = Math.floor((this.y + this.h - 4) / CONFIG.TILE);
    return isSolid(world.get(Math.floor(checkX / CONFIG.TILE), ty));
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
      if (this.vy > 0) { this.y = Math.floor((this.y + this.h) / CONFIG.TILE) * CONFIG.TILE - this.h - 0.01; this.onGround = true; }
      else if (this.vy < 0) this.y = Math.ceil(this.y / CONFIG.TILE) * CONFIG.TILE + 0.01;
      this.vy = 0;
    }
  }

  takeDamage(dmg, dir) {
    if (this.dead || this.hurtCD > 0) return;
    this.health -= dmg;
    this.hurtCD = 0.3;
    this.vx = dir * 4; this.vy = -4;
    if (this.health <= 0) this.dead = true;
  }

  startBurning() { this.burning = true; this.burnTimer = 3; }
}

class EnemyManager {
  constructor() {
    this.enemies = [];
    this.spawnTimer = 0;
  }

  update(dt, world, player, dayNight) {
    this.spawnTimer -= dt;
    if (dayNight.isNight() && this.spawnTimer <= 0 && this.enemies.length < CONFIG.MAX_ENEMIES) {
      this._trySpawn(world, player);
      this.spawnTimer = CONFIG.ENEMY_SPAWN_INTERVAL;
    }
    for (const e of this.enemies) e.update(dt, world, player);
    if (!dayNight.isNight()) {
      for (const e of this.enemies) {
        if (!e.burning && !e.dead) e.startBurning();
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead || e.deathAnim > 0);
    for (const e of this.enemies) {
      if (e.dead) { e.deathAnim = (e.deathAnim || 0.5) - dt; }
    }
  }

  _trySpawn(world, player) {
    const pc = player.getCenter();
    const px = Math.floor(pc.x / CONFIG.TILE);
    for (let attempt = 0; attempt < 10; attempt++) {
      const offset = (Math.random() > 0.5 ? 1 : -1) * (CONFIG.ENEMY_SPAWN_DISTANCE + Math.random() * 8);
      const sx = px + Math.floor(offset);
      if (sx < 2 || sx >= world.w - 2) continue;
      const sy = world.surface[sx] - 2;
      if (world.get(sx, sy) !== B.AIR) continue;
      const ex = sx * CONFIG.TILE, ey = sy * CONFIG.TILE - CONFIG.TILE;
      this.enemies.push(new Zombie(ex, ey));
      return;
    }
  }

  getAlive() { return this.enemies.filter(e => !e.dead); }
}