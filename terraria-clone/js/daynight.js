class DayNightCycle {
  constructor() {
    this.time = 0;
    this.dayLength = CONFIG.DAY_LENGTH;
    this.nightLength = CONFIG.NIGHT_LENGTH;
    this.duskLength = CONFIG.DUSK_LENGTH;
    this.dawnLength = CONFIG.DAWN_LENGTH;
    this.cycleLength = this.dayLength + this.duskLength + this.nightLength + this.dawnLength;
    this.phase = 'day';
  }

  update(dt) {
    this.time += dt;
    if (this.time >= this.cycleLength) this.time -= this.cycleLength;
    this._updatePhase();
  }

  _updatePhase() {
    const t = this.time;
    if (t < this.dayLength) this.phase = 'day';
    else if (t < this.dayLength + this.duskLength) this.phase = 'dusk';
    else if (t < this.dayLength + this.duskLength + this.nightLength) this.phase = 'night';
    else this.phase = 'dawn';
  }

  isNight() { return this.phase === 'night' || this.phase === 'dusk'; }

  getDarkness() {
    const t = this.time;
    if (t < this.dayLength) return 0;
    if (t < this.dayLength + this.duskLength) {
      const p = (t - this.dayLength) / this.duskLength;
      return p * 0.75;
    }
    if (t < this.dayLength + this.duskLength + this.nightLength) return 0.75;
    const p = (t - this.dayLength - this.duskLength - this.nightLength) / this.dawnLength;
    return (1 - p) * 0.75;
  }

  getSkyColor() {
    const d = this.getDarkness();
    const dayTop = [110, 170, 230], dayBot = [180, 220, 250];
    const nightTop = [8, 10, 25], nightBot = [20, 25, 50];
    const r = (a, b) => Math.round(a + (b - a) * d);
    return {
      top: [r(dayTop[0], nightTop[0]), r(dayTop[1], nightTop[1]), r(dayTop[2], nightTop[2])],
      bottom: [r(dayBot[0], nightBot[0]), r(dayBot[1], nightBot[1]), r(dayBot[2], nightBot[2])],
    };
  }

  getPhaseLabel() {
    return { day: '白天 ☀', dusk: '黄昏 🌅', night: '夜晚 🌙', dawn: '黎明 🌤' }[this.phase];
  }

  getTimeString() {
    const totalMin = (this.time / this.cycleLength) * 1440;
    const h = Math.floor(totalMin / 60) % 24;
    const m = Math.floor(totalMin % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}