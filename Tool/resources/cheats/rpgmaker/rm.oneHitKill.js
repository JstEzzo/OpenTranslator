window.$RTCheats.toggle('rm.oneHitKill', 'One-hit kill', function () {
  var party = window.$gameParty;
  var troop = window.$gameTroop;
  if (!party || !party.inBattle || !party.inBattle()) return;
  if (!troop || !troop.members) return;
  troop.members().forEach(function (e) {
    try { if (e.isAlive && e.isAlive() && e._hp > 1) e._hp = 1; } catch (err) {}
  });
}, false);
