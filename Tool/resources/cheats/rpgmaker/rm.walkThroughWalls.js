window.$RTCheats.toggle('rm.walkThroughWalls', 'Walk through walls', function () {
  var pl = window.$gamePlayer;
  if (pl && pl.setThrough) { try { pl.setThrough(true); } catch (e) {} }
}, false);
