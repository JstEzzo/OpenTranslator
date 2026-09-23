/**
 * OpenTranslator - QueueStarvationManager & CachePolicy
 * 
 * 1. QueueStarvationManager:
 *    Evita inanição (starvation) de tarefas de baixa prioridade (P5/P4) sob carga contínua
 *    através de um algoritmo de envelhecimento (aging) que promove tarefas antigas.
 * 
 * 2. CachePolicy:
 *    Implementa política estrita de cache com eviction LRU (Least Recently Used),
 *    limites máximos de contagem/memória e expiração opcional TTL.
 */

class QueueStarvationManager {
  constructor(options = {}) {
    this.starvationThresholdMs = options.starvationThresholdMs || 4000;
  }

  /**
   * Promove tarefas antigas nas filas de menor prioridade
   * Avalia as filas de nível mais alto primeiro para evitar dupla promoção no mesmo tick.
   */
  promoteAgedTasks(queues = {}) {
    const now = Date.now();
    let promotedCount = 0;

    // 1. Promove P4 -> P3 primeiro
    if (queues.P4 && queues.P3) {
      const remainingP4 = [];
      for (const item of queues.P4) {
        if (now - (item.enqueuedAt || now) > (this.starvationThresholdMs * 1.5)) {
          item.priority = 'P3';
          queues.P3.push(item);
          promotedCount++;
        } else {
          remainingP4.push(item);
        }
      }
      queues.P4 = remainingP4;
    }

    // 2. Promove P5 -> P4
    if (queues.P5 && queues.P4) {
      const remainingP5 = [];
      for (const item of queues.P5) {
        if (now - (item.enqueuedAt || now) > this.starvationThresholdMs) {
          item.priority = 'P4';
          queues.P4.push(item);
          promotedCount++;
        } else {
          remainingP5.push(item);
        }
      }
      queues.P5 = remainingP5;
    }

    return { promotedCount };
  }
}

class CachePolicy {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 20000;
    this.ttlMs = options.ttlMs || 0; // 0 = sem expiração
    this.cache = new Map(); // key -> { value, lastAccessed, createdAt }
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // Eviction LRU: Remove o item menos recentemente acessado
      let oldestKey = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.cache.entries()) {
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      lastAccessed: Date.now(),
      createdAt: Date.now()
    });
  }

  get(key) {
    if (!this.cache.has(key)) return null;

    const entry = this.cache.get(key);
    if (this.ttlMs > 0 && (Date.now() - entry.createdAt > this.ttlMs)) {
      this.cache.delete(key);
      return null;
    }

    entry.lastAccessed = Date.now();
    return entry.value;
  }

  size() {
    return this.cache.size;
  }
}

module.exports = {
  QueueStarvationManager,
  CachePolicy
};
