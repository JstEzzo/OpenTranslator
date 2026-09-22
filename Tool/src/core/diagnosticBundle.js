/**
 * OpenTranslator — DiagnosticBundle Generator
 * Gera resumo diagnóstico completo do sistema para suporte e depuração.
 * Mascara estritamente senhas, tokens e chaves de API.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const SelfTest = require("./selfTest");

class DiagnosticBundle {
  static redact(text) {
    if (!text || typeof text !== "string") return text;
    return text
      .replace(/apiKey["']?\s*[:=]\s*["'][^"']+["']/gi, 'apiKey: "[REDACTED]"')
      .replace(/token["']?\s*[:=]\s*["'][^"']+["']/gi, 'token: "[REDACTED]"')
      .replace(/password["']?\s*[:=]\s*["'][^"']+["']/gi, 'password: "[REDACTED]"')
      .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]');
  }

  static generateReport() {
    const selfTest = SelfTest.runAll();
    const info = {
      timestamp: new Date().toISOString(),
      platform: {
        os: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpus: os.cpus().length,
        freeMemMB: Math.round(os.freemem() / 1024 / 1024),
        totalMemMB: Math.round(os.totalmem() / 1024 / 1024)
      },
      nodeVersion: process.version,
      selfTest: selfTest.checks
    };

    return JSON.stringify(info, null, 2);
  }
}

module.exports = DiagnosticBundle;
