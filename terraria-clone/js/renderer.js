class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    this.camera = { x: 0, y: 0 };
    this.particles = [];
    this.clouds = [];
    this._initClouds();
    this.frameCount = 0;
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = false;
  }

  _initClouds() {
    for (let i = 0; i < 12; i++) {
      this.clouds.push({
        x: Math.random() * 3000,
        y: 30 + Math.random() * 120,
        w: 60 + Math.random() * 80,
        speed: 0.15 + Math.random() * 0.25,
      });
    }
  }

  updateCamera(player) {
    const cx = player.x + player.w / 2 - this.canvas.width / 2;
    const cy = player.y + player.h / 2 - this.canvas.height / 2;
    this.camera.x += (cx - this.camera.x) * CONFIG.CAMERA_LERP;
    this.camera.y += (cy - this.camera.y) * CONFIG.CAMERA_LERP;
  }

  render(world, player, enemyMgr, dayNight) {
    const ctx = this.ctx, cam = this.camera;
    const W = this.canvas.width, H = this.canvas.height;
    this.frameCount++;

    this._drawSky(ctx, W, H, dayNight, cam);
    this._drawClouds(ctx, W, H, dayNight, cam);

    const ts = CONFIG.TILE;
    const x0 = Math.floor(cam.x / ts) - 1;
    const y0 = Math.floor(cam.y / ts) - 1;
    const x1 = Math.ceil((cam.x + W) / ts) + 1;
    const y1 = Math.ceil((cam.y + H) / ts) + 1;

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const id = world.get(tx, ty);
        if (id === B.AIR) continue;
        const sx = Math.floor(tx * ts - cam.x);
        const sy = Math.floor(ty * ts - cam.y);
        this._drawBlock(ctx, id, sx, sy, ts, tx, ty, world);
      }
    }

    if (player.mineTarget) {
      const [mtx, mty] = player.mineTarget.split(',').map(Number);
      const sx = Math.floor(mtx * ts - cam.x);
      const sy = Math.floor(mty * ts - cam.y);
      this._drawMineCrack(ctx, sx, sy, ts, player.mineProgress);
    }

    this._drawEnemies(ctx, enemyMgr, cam, ts);
    this._drawPlayer(ctx, player, cam);

    this._updateParticles();
    this._drawParticles(ctx, cam);

    this._drawLighting(ctx, world, dayNight, cam, W, H, ts, x0, y0, x1, y1, player);

    if (player.hurtCooldown > 0.3) {
      ctx.fillStyle = `rgba(255,0,0,${(player.hurtCooldown - 0.3) * 0.8})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawSky(ctx, W, H, dn, cam) {
    const sky = dn.getSkyColor();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `rgb(${sky.top[0]},${sky.top[1]},${sky.top[2]})`);
    grad.addColorStop(1, `rgb(${sky.bottom[0]},${sky.bottom[1]},${sky.bottom[2]})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (dn.getDarkness() < 0.3) {
      const sunX = W * 0.7 - cam.x * 0.02;
      const sunY = H * 0.15;
      ctx.fillStyle = `rgba(255,240,180,${1 - dn.getDarkness() / 0.3})`;
      ctx.beginPath(); ctx.arc(sunX, sunY, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,220,100,${0.3 * (1 - dn.getDarkness() / 0.3)})`;
      ctx.beginPath(); ctx.arc(sunX, sunY, 42, 0, Math.PI * 2); ctx.fill();
    }
    if (dn.getDarkness() > 0.2) {
      const moonX = W * 0.3 - cam.x * 0.02;
      const moonY = H * 0.12;
      ctx.fillStyle = `rgba(220,220,240,${dn.getDarkness() / 0.75})`;
      ctx.beginPath(); ctx.arc(moonX, moonY, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgb(${sky.top[0]},${sky.top[1]},${sky.top[2]})`;
      ctx.beginPath(); ctx.arc(moonX + 7, moonY - 5, 16, 0, Math.PI * 2); ctx.fill();
      this._drawStars(ctx, W, H, dn, cam);
    }
  }

  _drawStars(ctx, W, H, dn, cam) {
    const alpha = dn.getDarkness() / 0.75;
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`;
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137.5 % W);
      const sy = (i * 73.3 % (H * 0.5));
      const tw = 0.5 + 0.5 * Math.sin(this.frameCount * 0.05 + i);
      ctx.fillRect(sx, sy, tw * 2, tw * 2);
    }
  }

  _drawClouds(ctx, W, H, dn, cam) {
    const alpha = 1 - dn.getDarkness() / 0.75;
    if (alpha < 0.1) return;
    for (const c of this.clouds) {
      c.x += c.speed;
      if (c.x > W + 200) c.x = -200;
      const sx = c.x - cam.x * 0.1;
      const sy = c.y - cam.y * 0.05;
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(sx, sy, c.w * 0.3, 0, Math.PI * 2);
      ctx.arc(sx + c.w * 0.3, sy - 5, c.w * 0.25, 0, Math.PI * 2);
      ctx.arc(sx - c.w * 0.3, sy + 3, c.w * 0.22, 0, Math.PI * 2);
      ctx.arc(sx + c.w * 0.1, sy + 8, c.w * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawBlock(ctx, id, sx, sy, ts, tx, ty, world) {
    const b = BLOCKS[id];
    if (!b) return;
    ctx.fillStyle = b.color || '#888';
    ctx.fillRect(sx, sy, ts, ts);

    switch (id) {
      case B.GRASS:
        ctx.fillStyle = b.top || '#5a9c4a';
        ctx.fillRect(sx, sy, ts, 5);
        ctx.fillStyle = '#6abc5a';
        ctx.fillRect(sx + 3, sy - 2, 3, 4);
        ctx.fillRect(sx + 12, sy - 2, 3, 4);
        ctx.fillRect(sx + 20, sy - 1, 3, 3);
        ctx.fillStyle = '#3a5c2a';
        ctx.fillRect(sx, sy + ts - 3, ts, 3);
        break;
      case B.DIRT:
        ctx.fillStyle = '#5a3a1b';
        ctx.fillRect(sx + 4, sy + 6, 4, 4);
        ctx.fillRect(sx + 16, sy + 14, 5, 4);
        ctx.fillRect(sx + 8, sy + 20, 4, 3);
        break;
      case B.STONE:
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(sx + 3, sy + 4, 5, 4);
        ctx.fillRect(sx + 16, sy + 10, 6, 5);
        ctx.fillRect(sx + 6, sy + 18, 4, 4);
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(sx + 14, sy + 3, 4, 3);
        ctx.fillRect(sx + 4, sy + 14, 3, 3);
        break;
      case B.WOOD:
        ctx.fillStyle = '#6a4a1a';
        ctx.fillRect(sx + 2, sy, 3, ts);
        ctx.fillRect(sx + ts - 5, sy, 3, ts);
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(sx + 10, sy + 4, 2, 6);
        ctx.fillRect(sx + 10, sy + 16, 2, 6);
        break;
      case B.LEAF:
        ctx.fillStyle = '#2a5a1a';
        ctx.fillRect(sx + 2, sy + 2, 5, 5);
        ctx.fillRect(sx + 14, sy + 4, 6, 5);
        ctx.fillRect(sx + 6, sy + 14, 5, 5);
        ctx.fillRect(sx + 18, sy + 16, 4, 4);
        ctx.fillStyle = '#4a8a3a';
        ctx.fillRect(sx + 8, sy + 8, 4, 4);
        break;
      case B.SAND:
        ctx.fillStyle = '#c4b070';
        ctx.fillRect(sx + 4, sy + 5, 3, 2);
        ctx.fillRect(sx + 16, sy + 12, 4, 2);
        ctx.fillRect(sx + 8, sy + 20, 3, 2);
        break;
      case B.COAL_ORE:
      case B.IRON_ORE:
      case B.GOLD_ORE:
      case B.DIAMOND_ORE:
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(sx + 3, sy + 4, 5, 4);
        ctx.fillRect(sx + 16, sy + 10, 6, 5);
        ctx.fillStyle = b.oreColor || '#888';
        ctx.fillRect(sx + 5, sy + 6, 5, 4);
        ctx.fillRect(sx + 16, sy + 14, 6, 5);
        ctx.fillRect(sx + 10, sy + 3, 4, 3);
        break;
      case B.PLANK:
        ctx.fillStyle = '#8a6a30';
        ctx.fillRect(sx, sy + ts / 2 - 1, ts, 2);
        ctx.fillStyle = '#b09050';
        ctx.fillRect(sx + 4, sy + 4, 2, ts / 2 - 6);
        ctx.fillRect(sx + 14, sy + 4, 2, ts / 2 - 6);
        ctx.fillRect(sx + 22, sy + 4, 2, ts / 2 - 6);
        ctx.fillRect(sx + 6, sy + ts / 2 + 2, 2, ts / 2 - 6);
        ctx.fillRect(sx + 18, sy + ts / 2 + 2, 2, ts / 2 - 6);
        break;
      case B.STONE_BRICK:
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(sx, sy + ts / 2 - 1, ts, 1);
        ctx.fillRect(sx + ts / 2 - 1, sy, 1, ts / 2);
        ctx.fillRect(sx + ts / 4, sy + ts / 2, 1, ts / 2);
        ctx.fillRect(sx + ts * 3 / 4, sy + ts / 2, 1, ts / 2);
        break;
      case B.GLASS:
        ctx.fillStyle = 'rgba(160,210,230,0.5)';
        ctx.fillRect(sx + 2, sy + 2, ts - 4, ts - 4);
        ctx.fillStyle = 'rgba(220,240,250,0.6)';
        ctx.fillRect(sx + 4, sy + 4, 4, 8);
        ctx.fillRect(sx + 4, sy + 4, 8, 3);
        break;
      case B.TORCH:
        ctx.fillStyle = '#6a4a20';
        ctx.fillRect(sx + ts / 2 - 2, sy + 8, 4, ts - 8);
        const flicker = 0.7 + 0.3 * Math.sin(this.frameCount * 0.3 + tx);
        ctx.fillStyle = `rgba(255,${Math.floor(120 + 60 * flicker)},40,${flicker})`;
        ctx.beginPath();
        ctx.arc(sx + ts / 2, sy + 6, 5 * flicker, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,220,100,${flicker})`;
        ctx.beginPath();
        ctx.arc(sx + ts / 2, sy + 6, 2.5 * flicker, 0, Math.PI * 2);
        ctx.fill();
        break;
      case B.WORKBENCH:
        ctx.fillStyle = '#6a4a20';
        ctx.fillRect(sx, sy, ts, 6);
        ctx.fillStyle = '#8a6a30';
        ctx.fillRect(sx + 2, sy + 6, 4, ts - 6);
        ctx.fillRect(sx + ts - 6, sy + 6, 4, ts - 6);
        ctx.fillStyle = '#a08040';
        ctx.fillRect(sx + 6, sy + 10, ts - 12, 4);
        break;
      case B.BEDROCK:
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(sx + 2, sy + 2, 6, 6);
        ctx.fillRect(sx + 16, sy + 4, 8, 8);
        ctx.fillRect(sx + 4, sy + 18, 8, 6);
        break;
      case B.PLATFORM:
        ctx.fillStyle = '#8a6a30';
        ctx.fillRect(sx, sy, ts, 6);
        ctx.fillStyle = '#a08040';
        ctx.fillRect(sx + 2, sy + 2, 2, 2);
        ctx.fillRect(sx + 10, sy + 2, 2, 2);
        ctx.fillRect(sx + 18, sy + 2, 2, 2);
        break;
    }

    if (id !== B.AIR && id !== B.TORCH && id !== B.LEAF && id !== B.GLASS) {
      if (world.get(tx, ty + 1) === B.AIR || isTransparent(world.get(tx, ty + 1))) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(sx, sy + ts - 3, ts, 3);
      }
      if (world.get(tx - 1, ty) === B.AIR) {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(sx, sy, 2, ts);
      }
      if (world.get(tx + 1, ty) === B.AIR) {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(sx + ts - 2, sy, 2, ts);
      }
    }
  }

  _drawMineCrack(ctx, sx, sy, ts, progress) {
    const stage = Math.min(4, Math.floor(progress / 3));
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= stage; i++) {
      ctx.beginPath();
      const ox = (i * 7) % (ts - 4) + 2;
      ctx.moveTo(sx + ox, sy + 2);
      ctx.lineTo(sx + ox + 4, sy + ts - 4);
      ctx.stroke();
    }
  }

  _drawPlayer(ctx, player, cam) {
    if (player.dead) return;
    const sx = Math.floor(player.x - cam.x);
    const sy = Math.floor(player.y - cam.y);
    const w = player.w, h = player.h;
    const f = player.facing;
    const walk = Math.abs(player.vx) > 0.5 ? Math.sin(this.frameCount * 0.4) : 0;

    ctx.fillStyle = '#e0a070';
    ctx.fillRect(sx + 3, sy, w - 6, 12);
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(sx + 3, sy + 2, w - 6, 4);
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(sx + (f > 0 ? w - 8 : 4), sy + 5, 4, 4);

    ctx.fillStyle = '#3060a0';
    ctx.fillRect(sx + 2, sy + 12, w - 4, 16);
    ctx.fillStyle = '#205090';
    ctx.fillRect(sx + 2, sy + 26, w - 4, 2);

    ctx.fillStyle = '#e0a070';
    const armOffset = player.attackCooldown > 0 ? -8 : walk * 3;
    ctx.fillRect(sx + (f > 0 ? w - 3 : 0), sy + 13 + armOffset, 3, 12);

    ctx.fillStyle = '#3a3a3a';
    const legL = sy + 28 + walk * 4;
    const legR = sy + 28 - walk * 4;
    ctx.fillRect(sx + 3, legL, 5, h - 28);
    ctx.fillRect(sx + w - 8, legR, 5, h - 28);

    const sel = player.inventory.getSelected();
    if (sel) {
      const item = ITEMS[sel.itemId];
      if (item && (item.tool || item.place)) {
        const hx = sx + (f > 0 ? w + 2 : -10);
        const hy = sy + 14 + (player.attackCooldown > 0 ? -6 : 0);
        ctx.font = '16px sans-serif';
        ctx.fillText(item.icon || '■', hx, hy + 14);
      }
    }
  }

  _drawEnemies(ctx, enemyMgr, cam, ts) {
    for (const e of enemyMgr.enemies) {
      if (e.dead && (e.deathAnim || 0) <= 0) continue;
      const sx = Math.floor(e.x - cam.x);
      const sy = Math.floor(e.y - cam.y);
      const alpha = e.dead ? Math.max(0, e.deathAnim / 0.5) : 1;
      ctx.globalAlpha = alpha;

      const walk = Math.abs(e.vx) > 0.5 ? Math.sin(this.frameCount * 0.3) : 0;
      const skin = e.burning ? '#c06030' : '#4a7a3a';

      ctx.fillStyle = skin;
      ctx.fillRect(sx + 3, sy, e.w - 6, 11);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(sx + (e.facing > 0 ? e.w - 7 : 3), sy + 4, 3, 3);

      ctx.fillStyle = e.burning ? '#804020' : '#2a4a2a';
      ctx.fillRect(sx + 2, sy + 11, e.w - 4, 16);
      ctx.fillStyle = skin;
      ctx.fillRect(sx + (e.facing > 0 ? e.w - 2 : -1), sy + 12, 3, 11);

      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(sx + 3, sy + 27 + walk * 3, 5, e.h - 27);
      ctx.fillRect(sx + e.w - 8, sy + 27 - walk * 3, 5, e.h - 27);

      if (!e.dead && e.health < e.maxHealth) {
        ctx.fillStyle = '#333';
        ctx.fillRect(sx, sy - 8, e.w, 4);
        ctx.fillStyle = '#c00';
        ctx.fillRect(sx, sy - 8, e.w * (e.health / e.maxHealth), 4);
      }
      if (e.burning && !e.dead) {
        ctx.fillStyle = `rgba(255,${100 + Math.random() * 100},0,0.7)`;
        ctx.fillRect(sx + 4, sy - 4, 4, 6);
        ctx.fillRect(sx + 12, sy - 6, 4, 8);
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawLighting(ctx, world, dn, cam, W, H, ts, x0, y0, x1, y1, player) {
    const darkness = dn.getDarkness();
    if (darkness < 0.02) return;

    const lightMap = new Float32Array((x1 - x0 + 1) * (y1 - y0 + 1));
    const lw = x1 - x0 + 1;
    const skyLight = 1 - darkness;

    for (let ty = y0; ty <= y1; ty++) {
      let sky = skyLight;
      for (let ty2 = y0; ty2 < ty; ty2++) {
        if (!isTransparent(world.get(x0, ty2))) { sky = 0; break; }
      }
      for (let tx = x0; tx <= x1; tx++) {
        const id = world.get(tx, ty);
        if (!isTransparent(id) && !isPlatform(id)) sky = 0;
        const li = (ty - y0) * lw + (tx - x0);
        lightMap[li] = sky;
      }
    }

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const id = world.get(tx, ty);
        const l = getLight(id);
        if (l > 0) {
          for (let dy = -l; dy <= l; dy++) {
            for (let dx = -l; dx <= l; dx++) {
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d > l) continue;
              const nx = tx + dx - x0, ny = ty + dy - y0;
              if (nx < 0 || nx >= lw || ny < 0 || ny >= y1 - y0 + 1) continue;
              const val = (1 - d / l) * 0.9;
              const li = ny * lw + nx;
              if (val > lightMap[li]) lightMap[li] = val;
            }
          }
        }
      }
    }

    const pc = player.getCenter();
    const ptx = Math.floor(pc.x / ts), pty = Math.floor(pc.y / ts);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 3) continue;
        const nx = ptx + dx - x0, ny = pty + dy - y0;
        if (nx < 0 || nx >= lw || ny < 0 || ny >= y1 - y0 + 1) continue;
        const val = (1 - d / 3) * 0.5;
        const li = ny * lw + nx;
        if (val > lightMap[li]) lightMap[li] = val;
      }
    }

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const li = (ty - y0) * lw + (tx - x0);
        const light = lightMap[li];
        if (light < 0.95) {
          const sx = Math.floor(tx * ts - cam.x);
          const sy = Math.floor(ty * ts - cam.y);
          ctx.fillStyle = `rgba(0,0,10,${(1 - light) * 0.82})`;
          ctx.fillRect(sx, sy, ts, ts);
        }
      }
    }
  }

  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 4,
        life: 0.5 + Math.random() * 0.3,
        color,
      });
    }
  }

  _updateParticles() {
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.3; p.life -= 0.016;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  _drawParticles(ctx, cam) {
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(Math.floor(p.x - cam.x), Math.floor(p.y - cam.y), 3, 3);
    }
    ctx.globalAlpha = 1;
  }
}