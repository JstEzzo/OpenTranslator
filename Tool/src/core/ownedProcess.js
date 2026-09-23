/**
 * OpenTranslator - OwnedProcess (Compatibility Wrapper)
 * Redireciona para o OwnedProcessRegistry canônico da Fase 9.
 */

const ownedProcessRegistry = require('./ownedProcessRegistry');

module.exports = {
  register: (childProcess, meta) => ownedProcessRegistry.register(childProcess, meta),
  terminateOwned: (pid, reason) => ownedProcessRegistry.stop(pid, reason).success,
  getOwnedList: () => ownedProcessRegistry.list(),
  shutdownOwnedAll: () => ownedProcessRegistry.shutdownAll(),
  isOwned: (pid) => ownedProcessRegistry.isOwned(pid),
  stop: (pid, reason) => ownedProcessRegistry.stop(pid, reason),
  stopSession: (sessionId, reason) => ownedProcessRegistry.stopSession(sessionId, reason)
};
