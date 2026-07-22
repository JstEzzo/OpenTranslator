/**
 * OpenTranslator — Módulo de Logger Assíncrono de Alta Performance
 *
 * Elimina o bloqueio síncrono da Event Loop usando fs.createWriteStream com buffer assíncrono.
 */

const fs = require("fs");

global.serverLogs = [];
global.logSeq = 0;

let logStream = null;

function getLogStream() {
  if (!logStream && global.LOG_PATH) {
    try {
      logStream = fs.createWriteStream(global.LOG_PATH, { flags: "a", encoding: "utf8" });
    } catch (e) {
      console.warn("[Logger] Falha ao criar WriteStream de log:", e.message);
    }
  }
  return logStream;
}

global.log = function (lvl, msg) {
  const ts = new Date().toLocaleTimeString();
  global.logSeq++;
  const entry = { id: global.logSeq, ts, level: lvl, message: msg };
  global.serverLogs.push(entry);
  if (global.serverLogs.length > 2000) global.serverLogs.shift();

  const line = "[" + ts + "][" + lvl + "] " + msg + "\n";
  const stream = getLogStream();
  if (stream) {
    stream.write(line);
  } else if (global.LOG_PATH) {
    fs.appendFile(global.LOG_PATH, line, () => {});
  }
};
