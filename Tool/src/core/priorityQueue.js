/**
 * PriorityQueue — Fila de tradução ordenada por prioridade visual.
 * P0 = Visível na tela agora (Overlay/HUD)
 * P1 = Diálogo principal ativo
 * P2 = Menu atual
 * P3 = Visto recentemente
 * P4 = Prefetch / Sequência de diálogo provável
 * P5 = Baixa prioridade / background
 */
class PriorityQueue {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 5000;
    this.queues = {
      P0: [],
      P1: [],
      P2: [],
      P3: [],
      P4: [],
      P5: []
    };
    this.inFlight = new Set();
  }

  enqueue(item, priority = 'P2') {
    const p = this.queues[priority] ? priority : 'P2';
    if (this.size() >= this.maxSize) {
      // Descarta item mais antigo de P5 se a fila estiver lotada
      if (this.queues.P5.length > 0) this.queues.P5.shift();
      else if (this.queues.P4.length > 0) this.queues.P4.shift();
      else return false; // Fila cheia com tarefas críticas
    }

    const entry = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: item.text,
      context: item.context || {},
      priority: p,
      enqueuedAt: Date.now()
    };

    this.queues[p].push(entry);
    return entry;
  }

  dequeue() {
    const priorities = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5'];
    for (const p of priorities) {
      if (this.queues[p].length > 0) {
        return this.queues[p].shift();
      }
    }
    return null;
  }

  dequeueBatch(maxBatchSize = 10) {
    const batch = [];
    const priorities = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5'];
    for (const p of priorities) {
      while (this.queues[p].length > 0 && batch.length < maxBatchSize) {
        batch.push(this.queues[p].shift());
      }
      if (batch.length >= maxBatchSize) break;
    }
    return batch;
  }

  size() {
    return Object.values(this.queues).reduce((sum, q) => sum + q.length, 0);
  }

  clear() {
    for (const k of Object.keys(this.queues)) {
      this.queues[k] = [];
    }
  }
}

module.exports = PriorityQueue;
