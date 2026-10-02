/**
 * OpenTranslator — Bridge Logger Legacy to LoggerManager
 */

const loggerManager = require("./loggerManager");

global.serverLogs = loggerManager.logs;
global.logSeq = 0;

global.log = function (lvl, msg) {
  // Capture caller origin from stack
  return loggerManager.log(lvl || "info", msg);
};

module.exports = loggerManager;
