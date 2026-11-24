class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer(this.canvas);
    this.input = new Input(this.canvas);
    this.world = new World(CONFIG.WORLD_W, CONFIG.WORLD_H);
    const spawn = this.world.findSpawn();
    this.player = new Player(spawn.x, spawn.y);
    this.enemyMgr = new EnemyManager();
    this.dayNight = new DayNightCycle();
    this.lastTime = performance.now();
    this.fps = 0; this.fpsCount = 0; this.fpsTime = 0;
    this.inventoryOpen = false;
    this.message = ''; this.messageTimer = 0;

    this._initStartItems();
    this._bindUI();
    this.input.setCamera(this.renderer.camera);
    this.input.onWheel((dir) => {
      let s = this.player.inventory.selected + dir;
      if (s < 0) s = 8;
      if (s > 8) s = 0;
      this.player.inventory.selectSlot(s);
      this._updateHotbar();
    });

    window.addEventListener('resize', () => this.renderer.resize());
    this._showMessage('欢迎！WASD移动，空格跳跃，左键挖掘/攻击，右键放置，E打开背包');
    requestAnimationFrame((t) => this._loop(t));
  }

  _initStartItems() {
    this.player.inventory.add('wood_pick', 1);
    this.player.inventory.add('wood_axe', 1);
    this.player.inventory.add('wood_sword', 1);
    this.player.inventory.add('torch', 10);
    this.player.inventory.add('apple', 3);
  }

  _bindUI() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'e') { this._toggleInventory(); e.preventDefault(); }
      if (k === 'r' && this.player.dead) this.player.respawn();
      if (k === 'f' && !this.player.dead) this.player.eatFood();
      if (k >= '1' && k <= '9') {
        this.player.inventory.selectSlot(parseInt(k) - 1);
        this._updateHotbar();
      }
    });
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2 && !this.player.dead) {
        this.player.placeBlock(this.world, this.input);
      }
    });
    this._buildInventoryUI();
  }

  _toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    const panel = document.getElementById('inventory-panel');
    if (this.inventoryOpen) {
      panel.classList.remove('hidden');
      this._refreshInventoryUI();
    } else {
      panel.classList.add('hidden');
    }
  }

  _buildInventoryUI() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 40; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.dataset.slot = i;
      slot.addEventListener('click', () => {
        if (i < 9) {
          this.player.inventory.selectSlot(i);
          this._updateHotbar();
        }
      });
      grid.appendChild(slot);
    }
  }

  _refreshInventoryUI() {
    const grid = document.getElementById('inventory-grid');
    for (let i = 0; i < 40; i++) {
      const el = grid.children[i];
      const s = this.player.inventory.slots[i];
      if (s) {
        const item = ITEMS[s.itemId];
        el.innerHTML = `<span class="slot-icon">${item.icon}</span><span class="slot-count">${s.count > 1 ? s.count : ''}</span>`;
      } else {
        el.innerHTML = '';
      }
    }
    const near = this.player.isNearWorkbench(this.world);
    const list = document.getElementById('crafting-list');
    list.innerHTML = '';
    for (const r of RECIPES) {
      const can = Crafting.canCraft(this.player.inventory, r, near);
      const div = document.createElement('div');
      div.className = 'recipe-item' + (can ? '' : ' disabled');
      const result = ITEMS[r.result.itemId];
      const ings = r.ingredients.map(i => `${ITEMS[i.itemId].name}x${i.count}`).join(', ');
      div.innerHTML = `<span>${result.icon} ${result.name}x${r.result.count}</span><span class="recipe-can">${can ? '✓' : `需要: ${ings}`}</span>`;
      if (can) div.addEventListener('click', () => {
        Crafting.craft(this.player.inventory, r, near);
        this._refreshInventoryUI();
        this._updateHotbar();
        this._showMessage(`制作了 ${result.name}`);
      });
      list.appendChild(div);
    }
  }

  _updateHotbar() {
    const slots = document.querySelectorAll('.hotbar-slot');
    for (let i = 0; i < 9; i++) {
      const el = slots[i];
      el.classList.toggle('active', i === this.player.inventory.selected);
      const s = this.player.inventory.slots[i];
      if (s) {
        const item = ITEMS[s.itemId];
        el.innerHTML = `<span class="slot-key">${i + 1}</span><span class="slot-icon">${item.icon}</span><span class="slot-count">${s.count > 1 ? s.count : ''}</span>`;
      } else {
        el.innerHTML = `<span class="slot-key">${i + 1}</span>`;
      }
    }
  }

  _updateUI() {
    const hf = document.getElementById('health-fill');
    const ht = document.getElementById('health-text');
    const pct = (this.player.health / this.player.maxHealth) * 100;
    hf.style.width = pct + '%';
    ht.textContent = `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;
    document.getElementById('time-indicator').textContent = `${this.dayNight.getPhaseLabel()} ${this.dayNight.getTimeString()}`;
    document.getElementById('fps-counter').textContent = `FPS: ${this.fps}`;
    document.getElementById('death-screen').classList.toggle('hidden', !this.player.dead);
    this._updateHotbar();
  }

  _showMessage(msg) {
    this.message = msg; this.messageTimer = 3;
    const box = document.getElementById('message-box');
    box.textContent = msg;
    box.classList.add('show');
  }

  _loop(time) {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.fpsCount++; this.fpsTime += dt;
    if (this.fpsTime >= 0.5) { this.fps = Math.round(this.fpsCount / this.fpsTime); this.fpsCount = 0; this.fpsTime = 0; }

    this._update(dt);
    this.renderer.updateCamera(this.player);
    this.input.setCamera(this.renderer.camera);
    this.renderer.render(this.world, this.player, this.enemyMgr, this.dayNight);
    this._updateUI();

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) document.getElementById('message-box').classList.remove('show');
    }

    this.input.clearJustPressed();
    requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    if (this.player.dead) {
      this.dayNight.update(dt);
      return;
    }
    this.player.update(dt, this.world, this.input, this.enemyMgr.enemies);
    this.enemyMgr.update(dt, this.world, this.player, this.dayNight);
    this.dayNight.update(dt);

    if (this.input.wasPressed('e') && this.inventoryOpen) this._refreshInventoryUI();

    if (this.player.mineTarget && this.input.mouseDown) {
      const [tx, ty] = this.player.mineTarget.split(',').map(Number);
      const id = this.world.get(tx, ty);
      if (id !== B.AIR && BLOCKS[id] && this.player.mineProgress > 0 && Math.random() < 0.3) {
        this.renderer.spawnParticles(
          tx * CONFIG.TILE + CONFIG.TILE / 2,
          ty * CONFIG.TILE + CONFIG.TILE / 2,
          BLOCKS[id].color, 2
        );
      }
    }

    for (const e of this.enemyMgr.enemies) {
      if (e.dead && !e._counted) {
        e._counted = true;
        this.renderer.spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#4a7a3a', 8);
      }
    }

    if (this.dayNight.phase === 'night' && !this._nightWarned) {
      this._showMessage('夜晚降临，僵尸出现了！小心战斗！');
      this._nightWarned = true;
    }
    if (this.dayNight.phase === 'day') this._nightWarned = false;
  }
}

window.addEventListener('load', () => { new Game(); });