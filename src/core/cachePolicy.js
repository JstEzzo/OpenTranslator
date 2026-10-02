const crypto = require('crypto');

class BoundedLRUCache {
  constructor(options = {}) {
    this.maxEntries = options.maxEntries || 5000;
    this.maxBytes = options.maxBytes || 50 * 1024 * 1024; // 50 MB
    this.defaultTTL = options.defaultTTL || 0; // 0 = no TTL expiration by default
    this.gameVersion = options.gameVersion || 'default';
    this.sourceLang = options.sourceLang || 'auto';
    this.targetLang = options.targetLang || 'pt-BR';

    this.cache = new Map(); // Key -> { value, size, expiresAt, lastAccessed }
    this.currentBytes = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
      sets: 0
    };
  }

  buildKey(text, context = '', langPair = null, version = null) {
    const pair = langPair || `${this.sourceLang}->${this.targetLang}`;
    const ver = version || this.gameVersion;
    const raw = `${ver}|${pair}|${context}|${text}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  _estimateSize(key, value) {
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);
    return Buffer.byteLength(key, 'utf8') + Buffer.byteLength(valStr, 'utf8') + 32;
  }

  get(text, context = '', options = {}) {
    const key = options.rawKey || this.buildKey(text, context, options.langPair, options.version);
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return null;
    }

    const entry = this.cache.get(key);

    // TTL check
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.stats.expirations++;
      this._deleteEntry(key);
      this.stats.misses++;
      return null;
    }

    // Refresh LRU position (delete and re-set)
    entry.lastAccessed = Date.now();
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    return entry.value;
  }

  set(text, value, context = '', options = {}) {
    const key = options.rawKey || this.buildKey(text, context, options.langPair, options.version);
    const ttl = options.ttl !== undefined ? options.ttl : this.defaultTTL;
    const expiresAt = ttl > 0 ? Date.now() + ttl : null;
    const size = this._estimateSize(key, value);

    // If key already exists, deduct old size
    if (this.cache.has(key)) {
      const old = this.cache.get(key);
      this.currentBytes -= old.size;
      this.cache.delete(key);
    }

    // Evict if limits exceeded
    while (
      (this.cache.size >= this.maxEntries || (this.currentBytes + size > this.maxBytes)) &&
      this.cache.size > 0
    ) {
      this._evictLRU();
    }

    const entry = {
      value,
      size,
      expiresAt,
      lastAccessed: Date.now(),
      created: Date.now()
    };

    this.cache.set(key, entry);
    this.currentBytes += size;
    this.stats.sets++;
    return true;
  }

  _evictLRU() {
    // Map keys() iterator yields keys in insertion order. Since get() refreshes key order,
    // the first key is always the least recently used.
    const lruKey = this.cache.keys().next().value;
    if (lruKey !== undefined) {
      this._deleteEntry(lruKey);
      this.stats.evictions++;
    }
  }

  _deleteEntry(key) {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      this.currentBytes = Math.max(0, this.currentBytes - entry.size);
      this.cache.delete(key);
    }
  }

  pruneExpired() {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this._deleteEntry(key);
        this.stats.expirations++;
        pruned++;
      }
    }
    return pruned;
  }

  invalidateVersion(version) {
    let cleared = 0;
    // Keys don't retain raw version unless we inspect or purge
    // If version changed, resetting cache or filtering is safe
    if (version !== this.gameVersion) {
      this.gameVersion = version;
      cleared = this.cache.size;
      this.clear();
    }
    return cleared;
  }

  clear() {
    this.cache.clear();
    this.currentBytes = 0;
  }

  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(1) + '%' : '0.0%';
    return {
      entries: this.cache.size,
      maxEntries: this.maxEntries,
      bytes: this.currentBytes,
      maxBytes: this.maxBytes,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations,
      sets: this.stats.sets,
      gameVersion: this.gameVersion,
      langPair: `${this.sourceLang}->${this.targetLang}`
    };
  }
}

module.exports = { BoundedLRUCache };
