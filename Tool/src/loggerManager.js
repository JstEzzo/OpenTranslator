/**
 * OpenTranslator — Centralized Logger Manager
 * 
 * Provides precise stack trace capture (file, function name, line number),
 * local timezone timestamps, safe object serialization via util.inspect,
 * and high-performance asynchronous log streaming.
 */

const fs = require("fs");
const path = require("path");
const util = require("util");

function getLocalTimestamp() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

class LoggerManager {
  constructor() {
    this.logs = [];
    this.maxMemoryLogs = 2000;
    this.logSeq = 0;
    this.logStream = null;
    this.logPath = null;
    this._lastDedupKey = null;
    this._lastDedupCount = 0;
  }

  /**
   * Sets the target file path for log persistence.
   * @param {string} filePath 
   */
  setLogPath(filePath) {
    this.logPath = filePath;
    if (filePath) {
      const logDir = path.dirname(filePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      this.logStream = fs.createWriteStream(filePath, { flags: "a", encoding: "utf8" });
    }
  }

  /**
   * Captures the caller origin (file name, function name, line number) from V8 stack trace safely.
   * @returns {{ file: string, func: string, line: number, col: number }}
   */
  getCallerInfo() {
    const origPrepare = Error.prepareStackTrace;
    try {
      Error.prepareStackTrace = (_, stack) => stack;
      const err = new Error();
      const stack = err.stack;

      if (!Array.isArray(stack) || stack.length < 3) {
        return { file: "unknown", func: "anonymous", line: 0, col: 0 };
      }

      // Traverse stack skipping logger internal frames
      let frame = stack[2];
      let depth = 2;
      while (frame && depth < stack.length) {
        const fileName = frame.getFileName() || "";
        if (fileName && !fileName.includes("loggerManager.js") && !fileName.includes("node:internal")) {
          break;
        }
        depth++;
        frame = stack[depth];
      }

      if (!frame) {
        return { file: "unknown", func: "anonymous", line: 0, col: 0 };
      }

      const rawFile = frame.getFileName() || "unknown";
      const fileName = path.basename(rawFile);
      const funcName = frame.getFunctionName() || frame.getMethodName() || "anonymous";
      const lineNumber = frame.getLineNumber() || 0;
      const columnNumber = frame.getColumnNumber() || 0;

      return {
        file: fileName,
        func: funcName,
        line: lineNumber,
        col: columnNumber
      };
    } catch (e) {
      return { file: "unknown", func: "anonymous", line: 0, col: 0 };
    } finally {
      Error.prepareStackTrace = origPrepare;
    }
  }

  /**
   * Core logging method with automatic origin resolution, local timezone, and safe object serialization.
   * @param {string} level - DEBUG, INFO, WARN, ERROR, SUCCESS
   * @param {any} message 
   * @param {Object} [originOverride] - Optional manual origin override
   */
  log(level, message, originOverride = null) {
    const ts = getLocalTimestamp();
    const caller = originOverride || this.getCallerInfo();

    let textMsg = "";
    let stackTrace = "";

    if (message instanceof Error) {
      textMsg = message.message;
      stackTrace = message.stack ? `\nStack Trace:\n${message.stack}` : "";
    } else if (typeof message === "object" && message !== null) {
      textMsg = util.inspect(message, { depth: 4, colors: false });
    } else {
      textMsg = String(message);
    }

    const lvlTag = level.toUpperCase().padEnd(7, " ");
    const originTag = `${caller.file}:L${caller.line}`;
    
    let formattedLine = "";
    if (textMsg.startsWith("=") || textMsg.startsWith("---") || textMsg.startsWith("___")) {
      formattedLine = `[${ts}] [${lvlTag}] ${textMsg}`;
    } else {
      const paddedOrigin = `[${originTag}]`.padEnd(25, " ");
      formattedLine = `[${ts}] [${lvlTag}] ${paddedOrigin} ${textMsg}${stackTrace}`;
    }

    this.logSeq++;
    const entry = {
      id: this.logSeq,
      ts,
      level: level.toLowerCase(),
      origin: originTag,
      file: caller.file,
      func: caller.func,
      line: caller.line,
      message: textMsg,
      formatted: formattedLine
    };

    // Buffer in memory (sempre: o frontend consome incrementalmente por id)
    this.logs.push(entry);
    if (this.logs.length > this.maxMemoryLogs) {
      this.logs.shift();
    }

    // Dedup de linhas idênticas CONSECUTIVAS no stdout/arquivo (evita spam de
    // blocos repetidos como o LAUNCHING GAME vindo de processos zumbis).
    const dedupKey = level.toLowerCase() + "|" + textMsg;
    const isRepeat = dedupKey === this._lastDedupKey;
    if (isRepeat) {
      this._lastDedupCount++;
    } else {
      this._lastDedupKey = dedupKey;
      this._lastDedupCount = 0;
    }

    if (!isRepeat || this._lastDedupCount === 50) {
      const outLine = isRepeat
        ? formattedLine + ` (x${this._lastDedupCount + 1})`
        : formattedLine;

      // Write to persistent file stream
      if (this.logStream) {
        this.logStream.write(outLine + "\n");
      } else if (this.logPath) {
        fs.appendFile(this.logPath, outLine + "\n", (err) => {
          if (err) {
            process.stderr.write(`[LoggerFS Error]: ${err.message}\n`);
          }
        });
      }

      // Output to stdout/stderr
      if (level.toUpperCase() === "ERROR") {
        process.stderr.write(outLine + "\n");
      } else {
        process.stdout.write(outLine + "\n");
      }
    }

    return entry;
  }

  info(msg) { return this.log("INFO", msg); }
  warn(msg) { return this.log("WARN", msg); }
  error(msg) { return this.log("ERROR", msg); }
  debug(msg) { return this.log("DEBUG", msg); }
  success(msg) { return this.log("SUCCESS", msg); }
}

const instance = new LoggerManager();
module.exports = instance;
