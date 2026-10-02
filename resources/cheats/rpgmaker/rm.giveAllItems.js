window.$RTCheats.action('rm.giveAllItems', 'Give all items', function () {
  var p = window.$gameParty;
  if (!p || !p.gainItem) return;
  var pools = [window.$dataItems, window.$dataWeapons, window.$dataArmors];
  pools.forEach(function (pool) {
    if (!pool) return;
    for (var i = 1; i < pool.length; i++) {
      var d = pool[i];
      if (d && d.name) { try { p.gainItem(d, 99); } catch (e) {} }
    }
  });
});
