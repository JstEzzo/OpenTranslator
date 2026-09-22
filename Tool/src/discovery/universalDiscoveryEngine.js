const fs = require('fs');
const path = require('path');
const ExecutableAnalyzer = require('../diagnostics/executableAnalyzer');

class UniversalDiscoveryEngine {
  constructor() {
    this.signaturesDir = path.resolve(__dirname, '../signatures');
    this.engines = this._loadJson('engines/signatures.json').signatures || [];
    this.runtimes = this._loadJson('runtimes/signatures.json').runtimes || [];
    this.renderers = this._loadJson('renderers/signatures.json').renderers || [];
    this.packaging = this._loadJson('packaging/signatures.json').formats || [];
    this.textSystems = this._loadJson('textSystems/signatures.json').systems || [];
    this.uiFrameworks = this._loadJson('uiFrameworks/signatures.json').frameworks || [];
  }

  _loadJson(rel) {
    try {
      const p = path.join(this.signaturesDir, rel);
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {}
    return {};
  }

  async discover(gamePath) {
    if (!gamePath || !fs.existsSync(gamePath)) {
      return { ok: false, error: 'Caminho inexistente' };
    }

    const isDir = fs.statSync(gamePath).isDirectory();
    const targetDir = isDir ? gamePath : path.dirname(gamePath);
    let mainExe = isDir ? null : gamePath;

    // Scan all file names shallowly and deeply for key files
    const fileSet = new Set();
    this._scanFiles(targetDir, fileSet, 0, 3);

    if (!mainExe) {
      for (const f of fileSet) {
        if (f.toLowerCase().endsWith('.exe') && !f.toLowerCase().includes('crash') && !f.toLowerCase().includes('unitycrash')) {
          mainExe = path.join(targetDir, f);
          break;
        }
      }
    }

    // 1. Executable PE Analysis
    let peInfo = null;
    if (mainExe && fs.existsSync(mainExe)) {
      peInfo = ExecutableAnalyzer.analyze(mainExe);
    }

    // 2. Multi-Hypothesis Engine Detection
    const engineHypotheses = [];
    for (const eng of this.engines) {
      let positiveMatches = [];
      let contradictionMatches = [];

      for (const pat of eng.positivePatterns) {
        if (this._matchesPattern(pat, fileSet)) {
          positiveMatches.push(pat);
        }
      }

      for (const con of eng.contradictions) {
        if (this._matchesPattern(con, fileSet)) {
          contradictionMatches.push(con);
        }
      }

      let score = 0;
      if (eng.positivePatterns.length > 0) {
        const ratio = positiveMatches.length / eng.positivePatterns.length;
        score = ratio * eng.defaultConfidence;
      }

      // Penalize heavily for contradictions
      if (contradictionMatches.length > 0) {
        score = score * 0.2;
      }

      // If at least one strong positive match, add candidate
      if (positiveMatches.length > 0) {
        engineHypotheses.push({
          engine: eng.name,
          engineId: eng.id,
          confidence: Math.min(1.0, Math.max(0.05, Math.round(score * 100) / 100)),
          positiveEvidence: positiveMatches,
          contradictions: contradictionMatches,
          missingEvidence: eng.positivePatterns.filter(p => !positiveMatches.includes(p))
        });
      }
    }

    // Sort hypotheses by confidence descending
    engineHypotheses.sort((a, b) => b.confidence - a.confidence);

    // Fallback unknown hypothesis if no high confidence
    const topHypothesis = engineHypotheses[0] || null;
    const isUnknown = !topHypothesis || topHypothesis.confidence < 0.50;

    // 3. Runtime Detection
    const detectedRuntimes = [];
    for (const rt of this.runtimes) {
      const matchedModules = rt.modules.filter(m => this._matchesPattern(m, fileSet));
      if (matchedModules.length > 0) {
        detectedRuntimes.push({ name: rt.name, id: rt.id, matchedModules });
      }
    }

    // 4. Renderer Detection
    const detectedRenderers = [];
    for (const rnd of this.renderers) {
      const matched = rnd.modules.filter(m => this._matchesPattern(m, fileSet));
      if (matched.length > 0) {
        detectedRenderers.push({ name: rnd.name, id: rnd.id, matched });
      }
    }

    // 5. Packaging Detection
    const detectedPackaging = [];
    for (const pkg of this.packaging) {
      const matched = pkg.extensions.filter(ext => {
        for (const f of fileSet) {
          if (f.toLowerCase().endsWith(ext.toLowerCase())) return true;
        }
        return false;
      });
      if (matched.length > 0) {
        detectedPackaging.push({ name: pkg.name, id: pkg.id, extensions: matched, virtualFS: !!pkg.virtualFS });
      }
    }

    // 6. Text System Detection
    const detectedTextSystems = [];
    for (const txt of this.textSystems) {
      const matched = txt.clues.filter(c => this._matchesPattern(c, fileSet));
      if (matched.length > 0) {
        detectedTextSystems.push({ name: txt.name, id: txt.id, clues: matched });
      }
    }

    // Build Discovery Report
    const report = {
      timestamp: new Date().toISOString(),
      gamePath,
      targetDir,
      executable: {
        path: mainExe ? path.basename(mainExe) : null,
        arch: peInfo ? peInfo.arch : 'unknown',
        subsystem: peInfo ? peInfo.subsystem : 'unknown',
        isDotNet: peInfo ? peInfo.isNet : false
      },
      isUnknownEngine: isUnknown,
      engineCandidates: engineHypotheses,
      primaryEngine: topHypothesis ? topHypothesis.engine : 'Unknown Custom Engine',
      detectedRuntimes: detectedRuntimes.map(r => r.name),
      detectedRenderers: detectedRenderers.map(r => r.name),
      detectedPackaging: detectedPackaging.map(p => p.name),
      detectedTextSystems: detectedTextSystems.map(t => t.name),
      unknownProfile: isUnknown ? {
        message: 'No single engine hypothesis surpassed 50% confidence.',
        suspectedNature: peInfo && peInfo.isNet ? '.NET Managed Application' : 'Native C/C++ Executable',
        availableFallbacks: ['Generic Runtime Observation', 'Screen OCR Adaptativo']
      } : null
    };

    return { ok: true, report };
  }

  _scanFiles(dir, set, depth, maxDepth) {
    if (depth > maxDepth) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        set.add(e.name);
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          this._scanFiles(path.join(dir, e.name), set, depth + 1, maxDepth);
        }
      }
    } catch (e) {}
  }

  _matchesPattern(pat, set) {
    const pLow = pat.toLowerCase();
    for (const s of set) {
      const sLow = s.toLowerCase();
      if (sLow === pLow || sLow.includes(pLow) || (pLow.startsWith('.') && sLow.endsWith(pLow))) {
        return true;
      }
    }
    return false;
  }
}

module.exports = UniversalDiscoveryEngine;
