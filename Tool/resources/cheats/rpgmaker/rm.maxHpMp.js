window.$RTCheats.action('rm.maxHpMp', 'Full heal party', function () {
  var p = window.$gameParty;
  if (!p || !p.members) return;
  p.members().forEach(function (m) {
    try { m.recoverAll(); } catch (e) {}
  });
});
