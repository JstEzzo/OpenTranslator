window.$RTCheats.action('rm.maxParams', 'Max level & stats', function () {
  var p = window.$gameParty;
  if (!p || !p.members) return;
  p.members().forEach(function (a) {
    try {
      if (a.changeLevel && a.maxLevel) a.changeLevel(a.maxLevel(), false);
      if (a.recoverAll) a.recoverAll();
    } catch (e) {}
  });
});
