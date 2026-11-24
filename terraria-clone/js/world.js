class World {
  constructor(w, h, seed) {
    this.w = w; this.h = h;
    this.seed = seed || Math.random() * 99999;
    this.tiles = new Uint8Array(w * h);
    this.surface = new Int16Array(w);
    this.generate();
  }

  idx(x, y) { return y * this.w + x; }

  get(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return B.BEDROCK;
    return this.tiles[this.idx(x, y)];
  }

  set(x, y, id) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    this.tiles[this.idx(x, y)] = id;
  }

  _noise(x, freq) {
    let n = Math.sin(x * freq * 12.9898 + this.seed * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  _smoothHeight(x) {
    const base = (CONFIG.SURFACE_MIN + CONFIG.SURFACE_MAX) / 2;
    let h = base;
    h += (this._noise(x, 0.04) - 0.5) * 18;
    h += (this._noise(x, 0.12) - 0.5) * 6;
    h += (this._noise(x, 0.3) - 0.5) * 2;
    return Math.floor(Math.max(CONFIG.SURFACE_MIN, Math.min(CONFIG.SURFACE_MAX, h)));
  }

  generate() {
    const w = this.w, h = this.h;
    for (let x = 0; x < w; x++) {
      const sy = this._smoothHeight(x);
      this.surface[x] = sy;
      for (let y = 0; y < h; y++) {
        if (y < sy) {
          this.set(x, y, B.AIR);
        } else if (y === sy) {
          this.set(x, y, B.GRASS);
        } else if (y < sy + 4 + Math.floor(this._noise(x, 0.2) * 2)) {
          this.set(x, y, B.DIRT);
        } else if (y >= h - 1) {
          this.set(x, y, B.BEDROCK);
        } else {
          this.set(x, y, B.STONE);
        }
      }
    }

    for (let x = 0; x < w; x++) {
      const sy = this.surface[x];
      for (let y = sy + 6; y < h - 2; y++) {
        const depth = y - sy;
        const r = this._noise(x * 7 + y * 13, 0.5);
        if (depth > 4 && r < 0.08) this.set(x, y, B.COAL_ORE);
        else if (depth > 10 && r < 0.055) this.set(x, y, B.IRON_ORE);
        else if (depth > 20 && r < 0.03) this.set(x, y, B.GOLD_ORE);
        else if (depth > 30 && r < 0.015) this.set(x, y, B.DIAMOND_ORE);
      }
    }

    for (let x = 3; x < w - 3; x++) {
      if (this._noise(x, 0.15) < 0.18) {
        const sy = this.surface[x];
        if (this.get(x, sy - 1) !== B.AIR) continue;
        const th = 3 + Math.floor(this._noise(x * 3, 0.8) * 4);
        for (let i = 1; i <= th; i++) this.set(x, sy - i, B.WOOD);
        const tc = sy - th;
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (Math.abs(dx) + Math.abs(dy) <= 2 && this.get(x + dx, tc + dy) === B.AIR)
              this.set(x + dx, tc + dy, B.LEAF);
          }
        }
        this.set(x, tc, B.LEAF);
      }
    }

    for (let x = 0; x < w; x++) {
      const sy = this.surface[x];
      if (sy < CONFIG.SURFACE_MIN + 4 && this.get(x, sy) === B.GRASS) {
        if (this._noise(x, 0.2) < 0.3) this.set(x, sy, B.SAND);
      }
    }
  }

  findSpawn() {
    const cx = Math.floor(this.w / 2);
    for (let x = cx; x < this.w; x++) {
      if (this.get(x, this.surface[x] - 1) === B.AIR) return { x: x * CONFIG.TILE, y: (this.surface[x] - 3) * CONFIG.TILE };
    }
    return { x: cx * CONFIG.TILE, y: (this.surface[cx] - 3) * CONFIG.TILE };
  }

  isSolidAt(px, py) {
    const tx = Math.floor(px / CONFIG.TILE);
    const ty = Math.floor(py / CONFIG.TILE);
    return isSolid(this.get(tx, ty));
  }

  checkAABB(x, y, w, h) {
    const x1 = Math.floor(x / CONFIG.TILE);
    const y1 = Math.floor(y / CONFIG.TILE);
    const x2 = Math.floor((x + w - 0.01) / CONFIG.TILE);
    const y2 = Math.floor((y + h - 0.01) / CONFIG.TILE);
    for (let ty = y1; ty <= y2; ty++) {
      for (let tx = x1; tx <= x2; tx++) {
        if (isSolid(this.get(tx, ty))) return true;
      }
    }
    return false;
  }

  checkPlatformCollision(x, y, w, prevY) {
    if (y < prevY) return false;
    const ty = Math.floor(y / CONFIG.TILE);
    const x1 = Math.floor(x / CONFIG.TILE);
    const x2 = Math.floor((x + w - 0.01) / CONFIG.TILE);
    const prevTy = Math.floor(prevY / CONFIG.TILE);
    if (ty !== prevTy) {
      for (let tx = x1; tx <= x2; tx++) {
        if (isPlatform(this.get(tx, ty))) return true;
      }
    }
    return false;
  }

  getNearbyLight(cx, cy, radius) {
    let maxLight = 0;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const l = getLight(this.get(cx + dx, cy + dy));
        if (l > 0) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          const light = l - dist * 0.8;
          if (light > maxLight) maxLight = light;
        }
      }
    }
    return maxLight;
  }
}