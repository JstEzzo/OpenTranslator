window.$RTCheats.toggle('rm.noEncounters', 'No random encounters', function () {
  var pl = window.$gamePlayer;
  // Keep the step counter high so it never reaches 0 and triggers a battle.
  if (pl) { try { pl._encounterCount = 9999; } catch (e) {} }
}, false);
