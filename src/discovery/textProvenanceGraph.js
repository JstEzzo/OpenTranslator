class TextProvenanceGraph {
  constructor() {
    this.nodes = new Map(); // id -> node
    this.edges = []; // { from, to, type }
  }

  addNode(id, type, metadata = {}) {
    const node = { id, type, metadata, timestamp: Date.now() };
    this.nodes.set(id, node);
    return node;
  }

  addEdge(fromId, toId, relationship) {
    this.edges.push({ from: fromId, to: toId, relationship });
  }

  /**
   * Register string provenance tracing from physical file to visible screen.
   */
  recordProvenance(stringText, details = {}) {
    const strId = `str_${Buffer.from(stringText).toString('base64').substring(0, 16)}`;
    
    // File node
    if (details.sourceFile) {
      const fileId = `file_${details.sourceFile}`;
      this.addNode(fileId, 'FILE', { path: details.sourceFile });
      this.addEdge(fileId, strId, 'CONTAINS_STRING');
    }

    // UI Component node
    if (details.uiComponent) {
      const uiId = `ui_${details.uiComponent}`;
      this.addNode(uiId, 'UI_COMPONENT', { name: details.uiComponent });
      this.addEdge(strId, uiId, 'RENDERED_BY');
    }

    // Screen text node
    const screenId = `screen_${strId}`;
    this.addNode(screenId, 'SCREEN_TEXT', {
      visible: !!details.screenObserved,
      ocrMatch: !!details.ocrMatch
    });
    this.addEdge(strId, screenId, 'DISPLAYS_AS');

    const entry = {
      text: stringText,
      source: details.sourceFile || 'unknown',
      sourceOffset: details.sourceOffset || 0,
      parser: details.parser || 'generic',
      runtimeObserved: !!details.runtimeObserved,
      runtimeAddress: details.runtimeAddress || null,
      uiObject: details.uiComponent || null,
      screenObserved: !!details.screenObserved,
      ocrMatch: !!details.ocrMatch,
      confidence: details.confidence !== undefined ? details.confidence : 0.85
    };

    this.addNode(strId, 'STRING', entry);
    return entry;
  }

  correlate(screenText, staticCandidates = []) {
    const normalizedScreen = screenText.trim().toLowerCase();
    for (const cand of staticCandidates) {
      if (cand.text && cand.text.trim().toLowerCase() === normalizedScreen) {
        return {
          matched: true,
          confidence: 0.95,
          sourceFile: cand.file,
          parser: cand.parser || 'json',
          element: cand.element || null
        };
      }
    }
    return {
      matched: false,
      confidence: 0.40,
      sourceFile: null,
      parser: null
    };
  }

  getSummary() {
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      stringNodes: Array.from(this.nodes.values()).filter(n => n.type === 'STRING').length
    };
  }
}

module.exports = TextProvenanceGraph;
