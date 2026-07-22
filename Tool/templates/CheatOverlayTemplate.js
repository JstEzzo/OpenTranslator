(function() {
  var fs;
  try { fs = require('fs'); } catch(e) {}
  function logToFile(msg) {
    if (!fs) return;
    try {
      fs.appendFileSync('cheat_overlay.log', '[' + new Date().toLocaleTimeString() + '] ' + msg + '\n');
    } catch(e) {}
  }
  logToFile('Iniciando CheatOverlay...');
  var pollUrl = 'http://127.0.0.1:16005/cheat_poll';

  function pollCheat() {
    try {
      if (!window.$gameParty || !window.$gamePlayer || !window.$gameSystem || !window.$gameMap) {
        setTimeout(pollCheat, 1000);
        return;
      }
      var state;
      try {
        var ownedItems = [];
        var allDbItems = [];
        if (typeof $dataItems !== 'undefined' && $dataItems) {
          try {
            $gameParty.items().forEach(function(item) {
              if (item && item.name) ownedItems.push({ id: item.id, name: item.name, type: 'item', count: $gameParty.numItems(item) });
            });
            $gameParty.weapons().forEach(function(item) {
              if (item && item.name) ownedItems.push({ id: item.id, name: item.name, type: 'weapon', count: $gameParty.numItems(item) });
            });
            $gameParty.armors().forEach(function(item) {
              if (item && item.name) ownedItems.push({ id: item.id, name: item.name, type: 'armor', count: $gameParty.numItems(item) });
            });
            
            $dataItems.forEach(function(item) {
              if (item && item.name) allDbItems.push({ id: item.id, name: item.name, type: 'item' });
            });
            $dataWeapons.forEach(function(item) {
              if (item && item.name) allDbItems.push({ id: item.id, name: item.name, type: 'weapon' });
            });
            $dataArmors.forEach(function(item) {
              if (item && item.name) allDbItems.push({ id: item.id, name: item.name, type: 'armor' });
            });
          } catch(e) {}
        }
        
        state = {
          gold: typeof $gameParty.gold === 'function' ? $gameParty.gold() : 0,
          mapId: typeof $gameMap.mapId === 'function' ? $gameMap.mapId() : 0,
          x: $gamePlayer.x !== undefined ? $gamePlayer.x : 0,
          y: $gamePlayer.y !== undefined ? $gamePlayer.y : 0,
          through: typeof $gamePlayer.isThrough === 'function' ? $gamePlayer.isThrough() : false,
          encounterDisabled: !$gameSystem.isEncounterEnabled(),
          actors: (typeof $gameParty.members === 'function' ? $gameParty.members() : []).map(function(a, idx) {
            return {
              idx: idx, name: typeof a.name === 'function' ? a.name() : '', hp: a.hp || 0, mhp: a.mhp || 0, mp: a.mp || 0, mmp: a.mmp || 0, tp: a.tp || 0, level: a.level || 1
            };
          }),
          ownedItems: ownedItems,
          allDbItems: allDbItems
        };
      } catch(err) {
        setTimeout(pollCheat, 1000);
        return;
      }
      
      var xhr = new XMLHttpRequest();
      xhr.open('POST', pollUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            var commands = JSON.parse(xhr.responseText);
            if (Array.isArray(commands) && commands.length > 0) {
              commands.forEach(function(cmd) {
                try {
                  if (cmd && typeof cmd.code === 'string' && (cmd.code.startsWith('$game') || cmd.code.startsWith('window.'))) {
                    (new Function(cmd.code))();
                  }
                } catch(ex) {}
              });
            }
          } catch(e) {}
        }
        setTimeout(pollCheat, 1000);
      };
      xhr.onerror = function() {
        setTimeout(pollCheat, 2000);
      };
      xhr.send(JSON.stringify(state));
    } catch(e) {
      setTimeout(pollCheat, 2000);
    }
  }
  setInterval(function() {
    try {
      if (window.godHP && window.$gameParty && typeof window.$gameParty.members === 'function') {
        var members = window.$gameParty.members();
        if (Array.isArray(members)) {
          members.forEach(function(a) {
            if (a && typeof a.setHp === 'function') a.setHp(a.mhp);
          });
        }
      }
      if (window.godMP && window.$gameParty && typeof window.$gameParty.members === 'function') {
        var members = window.$gameParty.members();
        if (Array.isArray(members)) {
          members.forEach(function(a) {
            if (a && typeof a.setMp === 'function') a.setMp(a.mmp);
          });
        }
      }
    } catch(e) {}
  }, 100);
  pollCheat();
})();
