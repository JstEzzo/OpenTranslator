/**
 * OpenTranslator — LogIntelligence & LogCorrelation
 * Correlaciona logs do OpenTranslator com logs nativos do jogo
 * (Unity Player.log, Ren'Py log.txt, BepInEx LogOutput.log) usando JobId, PID e timestamp.
 */

const fs = require("fs");
const path = require("path");

class LogIntelligence {
  static parseUnityLog(logPath) {
    if (!fs.existsSync(logPath)) return { engineVersion: null, errors: [] };
    const content = fs.readFileSync(logPath, 'utf8');
    const verMatch = content.match(/Initialize engine version:\s*([\d\.\w]+)/i);
    const errors = [];
    const lines = content.split('\n');
    for (const l of lines) {
      if (/Exception|Error|Crash/i.test(l) && !/CrashReporter: Initialized/i.test(l)) {
        errors.push(l.trim());
      }
    }
    return {
      engineVersion: verMatch ? verMatch[1] : 'unknown',
      errors: errors.slice(0, 10)
    };
  }
  parseUnityLog(p) { return LogIntelligence.parseUnityLog(p); }

  /**
   * Localiza arquivos de log de jogos conhecidos no sistema.
   */
  static findGameLogs(gameDir, engine) {
    const found = [];
    const eng = (engine || "").toLowerCase();

    if (eng === "unity") {
      const locLow = process.env.LocalAppData || "";
      const locLowLow = path.join(path.dirname(locLow), "LocalLow");
      if (fs.existsSync(locLowLow)) {
        try {
          const companies = fs.readdirSync(locLowLow);
          for (const c of companies) {
            const cDir = path.join(locLowLow, c);
            if (fs.statSync(cDir).isDirectory()) {
              const games = fs.readdirSync(cDir);
              for (const g of games) {
                const playerLog = path.join(cDir, g, "Player.log");
                if (fs.existsSync(playerLog)) found.push({ type: "Unity Player.log", path: playerLog });
              }
            }
          }
        } catch (e) {}
      }
    }

    // Ren'Py log
    const renpyLog = path.join(gameDir, "log.txt");
    if (fs.existsSync(renpyLog)) found.push({ type: "Ren'Py log.txt", path: renpyLog });

    return found;
  }

  /**
   * Correlaciona eventos temporais entre o OpenTranslator e o processo do jogo.
   */
  static correlate(events = []) {
    return events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)).map(e => ({
      time: new Date(e.timestamp || Date.now()).toLocaleTimeString(),
      stage: e.stage || "general",
      message: e.message,
      pid: e.pid || null
    }));
  }
}

module.exports = LogIntelligence;
