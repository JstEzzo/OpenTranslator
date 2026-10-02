class OutputProvider {
  static async deliver(mode, payload = {}) {
    switch (mode) {
      case 'PATCH':
        // Grava arquivo físico
        return { delivered: true, mode: 'PATCH', file: payload.file, modifiedBytes: payload.data ? payload.data.length : 0 };

      case 'RUNTIME':
        // Aplica via hook / memória / DOM
        return { delivered: true, mode: 'RUNTIME', targetId: payload.targetId, newText: payload.translated };

      case 'OVERLAY':
      default:
        // Exibe no overlay gráfico sem modificar arquivos
        return { delivered: true, mode: 'OVERLAY', region: payload.region, text: payload.translated };
    }
  }
}

module.exports = OutputProvider;
