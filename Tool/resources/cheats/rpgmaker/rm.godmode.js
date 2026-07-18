window.$RTCheats.toggle('rm.godmode', 'Godmode (no damage)', function () {
  var p = window.$gameParty;
  if (!p || !p.members) return;
  var ms = p.members();
  for (var i = 0; i < ms.length; i++) {
    var m = ms[i];
    try {
      m._hp = m.mhp;
      m._mp = m.mmp;
      if (m.maxTp) m._tp = m.maxTp();
    } catch (e) {}
  }
}, false);
