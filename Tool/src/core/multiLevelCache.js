const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MultiLevelCache {
  constructor(options = {}) {
    this.l1Memory = new Map(); // L1: Memória ultra rápida
    this.l4Manual = new Map(); // L4: Sobrescritas manuais de usuário (máxima prioridade)
    this.maxL1Size = options.maxL1Size || 10000;
    this.diskCacheDir = options.diskCacheDir || path.resolve(__dirname, '../../../data/cache');
    if (!fs.existsSync(this.diskCacheDir)) {
      fs.mkdirSync(this.diskCacheDir, { recursive: true });
    }
    this.stats = { l1Hits: 0, l2Hits: 0, l3Hits: 0, l4Hits: 0, misses: 0 };
  }

  _hashKey(text, context = '') {
    return crypto.createHash('md5').update(`${text}__${context}`).digest('hex');
  }

  setManualOverride(text, translation, context = '') {
    const key = this._hashKey(text, context);
    this.l4Manual.set(key, { original: text, translation, source: 'manual', timestamp: Date.now() });
    this.l1Memory.set(key, translation);
  }

  get(text, context = '') {
    const key = this._hashKey(text, context);

    // 1. Checa L4 Manual
    if (this.l4Manual.has(key)) {
      this.stats.l4Hits++;
      return { found: true, translation: this.l4Manual.get(key).translation, level: 'L4_MANUAL' };
    }

    // 2. Checa L1 Memória
    if (this.l1Memory.has(key)) {
      this.stats.l1Hits++;
      return { found: true, translation: this.l1Memory.get(key), level: 'L1_MEMORY' };
    }

    // 3. Checa L3 Disco
    const diskFile = path.join(this.diskCacheDir, `${key.slice(0, 2)}`, `${key}.json`);
    if (fs.existsSync(diskFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(diskFile, 'utf8'));
        this.stats.l3Hits++;
        this.setL1(text, data.translation, context);
        return { found: true, translation: data.translation, level: 'L3_DISK' };
      } catch (e) {}
    }

    this.stats.misses++;
    return { found: false, translation: null, level: 'NONE' };
  }

  setL1(text, translation, context = '') {
    const key = this._hashKey(text, context);
    if (this.l1Memory.size >= this.maxL1Size) {
      // Remove primeiro item (FIFO simples)
      const first = this.l1Memory.keys().next().value;
      this.l1Memory.delete(first);
    }
    this.l1Memory.set(key, translation);
  }

  setL3(text, translation, context = '') {
    this.setL1(text, translation, context);
    const key = this._hashKey(text, context);
    const sub = path.join(this.diskCacheDir, key.slice(0, 2));
    if (!fs.existsSync(sub)) fs.mkdirSync(sub, { recursive: true });
    const diskFile = path.join(sub, `${key}.json`);
    fs.writeFileSync(diskFile, JSON.stringify({ original: text, translation, context, timestamp: Date.now() }), 'utf8');
  }

  getStats() {
    const total = this.stats.l1Hits + this.stats.l3Hits + this.stats.l4Hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.l1Hits + this.stats.l3Hits + this.stats.l4Hits) / total * 100).toFixed(1) : '0.0';
    return {
      ...this.stats,
      totalRequests: total,
      hitRate: `${hitRate}%`,
      l1Size: this.l1Memory.size,
      l4Size: this.l4Manual.size
    };
  }
}

module.exports = MultiLevelCache;
