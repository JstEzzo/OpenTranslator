const fs = require("fs");

global.serverLogs = [];
global.logSeq = 0;

global.log = function (lvl, msg) {
  const ts = new Date().toLocaleTimeString();
  global.logSeq++;
  const entry = { id: global.logSeq, ts, level: lvl, message: msg };
  global.serverLogs.push(entry);
  if (global.serverLogs.length > 2000) global.serverLogs.shift();
  try {
    fs.appendFileSync(global.LOG_PATH, "[" + ts + "][" + lvl + "] " + msg + "\n");
  } catch (e) {}
};
