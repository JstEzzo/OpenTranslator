window.$RTCheats.action('rm.instantWin', 'Instant win battle', function () {
  var p = window.$gameParty;
  var BM = window.BattleManager;
  if (p && p.inBattle && p.inBattle() && BM && BM.processVictory) {
    try { BM.processVictory(); } catch (e) {}
  }
});
