class Inventory {
  constructor(size) {
    this.size = size || 40;
    this.slots = new Array(this.size).fill(null);
    this.hotbarSize = 9;
    this.selected = 0;
  }

  add(itemId, count) {
    count = count || 1;
    const item = ITEMS[itemId];
    if (!item) return count;
    const max = item.stack || 99;
    for (let i = 0; i < this.size && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.itemId === itemId && s.count < max) {
        const add = Math.min(max - s.count, count);
        s.count += add; count -= add;
      }
    }
    for (let i = 0; i < this.size && count > 0; i++) {
      if (!this.slots[i]) {
        const add = Math.min(max, count);
        this.slots[i] = { itemId, count: add }; count -= add;
      }
    }
    return count;
  }

  remove(itemId, count) {
    count = count || 1;
    for (let i = 0; i < this.size && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.itemId === itemId) {
        const rem = Math.min(s.count, count);
        s.count -= rem; count -= rem;
        if (s.count <= 0) this.slots[i] = null;
      }
    }
    return count;
  }

  countItem(itemId) {
    let n = 0;
    for (let i = 0; i < this.size; i++) {
      if (this.slots[i] && this.slots[i].itemId === itemId) n += this.slots[i].count;
    }
    return n;
  }

  hasItem(itemId, count) {
    return this.countItem(itemId) >= (count || 1);
  }

  getSelected() {
    return this.slots[this.selected];
  }

  removeFromSelected(count) {
    const s = this.slots[this.selected];
    if (!s) return false;
    count = count || 1;
    if (s.count < count) return false;
    s.count -= count;
    if (s.count <= 0) this.slots[this.selected] = null;
    return true;
  }

  removeFromSlot(slot, count) {
    const s = this.slots[slot];
    if (!s) return false;
    count = count || 1;
    if (s.count < count) return false;
    s.count -= count;
    if (s.count <= 0) this.slots[slot] = null;
    return true;
  }

  swap(slot1, slot2) {
    const tmp = this.slots[slot1];
    this.slots[slot1] = this.slots[slot2];
    this.slots[slot2] = tmp;
  }

  selectSlot(slot) {
    if (slot >= 0 && slot < this.hotbarSize) this.selected = slot;
  }
}