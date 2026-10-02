window.$RTCheats.action('rm.addGold', 'Add 1000 gold', function () {
  var p = window.$gameParty;
  if (p && p.gainGold) p.gainGold(1000);
});
