const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class GameCompatibilityPassport {
  static generateIdentity(gamePath) {
    if (!fs.existsSync(gamePath)) return null;
    const isDir = fs.statSync(gamePath).isDirectory();
    const targetDir = isDir ? gamePath : path.dirname(gamePath);

    // Compute hash of primary executable if available
    let exeHash = 'no_exe';
    let exeSize = 0;
    const files = fs.readdirSync(targetDir);
    const exe = files.find(f => f.toLowerCase().endsWith('.exe'));
    if (exe) {
      const exePath = path.join(targetDir, exe);
      const buf = fs.readFileSync(exePath);
      exeHash = crypto.createHash('sha256').update(buf.subarray(0, 512 * 1024)).digest('hex');
      exeSize = fs.statSync(exePath).size;
    }

    return {
      gameId: crypto.createHash('md5').update(`${path.basename(targetDir)}_${exeHash}`).digest('hex'),
      gameName: path.basename(targetDir),
      exeHash: exeHash.substring(0, 16),
      exeSize,
      fileCount: files.length
    };
  }

  static createPassport(discoveryReport, identity, strategies = []) {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      identity,
      engine: {
        primary: discoveryReport.primaryEngine,
        candidates: discoveryReport.engineCandidates,
        isUnknown: discoveryReport.isUnknownEngine
      },
      runtime: discoveryReport.detectedRuntimes,
      renderer: discoveryReport.detectedRenderers,
      packaging: discoveryReport.detectedPackaging,
      textSystems: discoveryReport.detectedTextSystems,
      strategies: strategies.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        confidence: s.confidence,
        risk: s.risk || 'LOW'
      })),
      readiness: discoveryReport.isUnknownEngine ? 'EXPERIMENTAL' : 'READY',
      lastTested: new Date().toISOString()
    };
  }

  static save(passport, outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    const p = path.join(outDir, `passport_${passport.identity.gameId}.json`);
    fs.writeFileSync(p, JSON.stringify(passport, null, 2), 'utf8');
    return p;
  }
}

module.exports = GameCompatibilityPassport;
