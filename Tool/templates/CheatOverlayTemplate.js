(function() {
  var fs;
  try { fs = require('fs'); } catch(e) {}
  function logToFile(msg) {
    if (!fs) return;
    try {
      fs.appendFileSync('cheat_overlay.log', '[' + new Date().toLocaleTimeString() + '] ' + msg + '\n');
    } catch(e) {}
  }
  logToFile('Iniciando CheatOverlay com Varredor de Escopo RPG Maker...');
  var pollUrl = 'http://127.0.0.1:16005/cheat_poll';

  // Varredor de Escopo (In-Game Hook)
  function scanVariablesAndSwitches() {
    var scannedVars = [];
    var scannedSwitches = [];
    try {
      if (typeof $gameVariables !== 'undefined' && $gameVariables && $gameVariables._data) {
        var vData = $gameVariables._data;
        var vNames = (typeof $dataSystem !== 'undefined' && $dataSystem && $dataSystem.variables) ? $dataSystem.variables : [];
        for (var i = 1; i < vData.length; i++) {
          var val = vData[i];
          if (val !== undefined && val !== null && val !== '') {
            var name = (vNames[i] && typeof vNames[i] === 'string' && vNames[i].trim()) ? vNames[i].trim() : ('Var ' + i);
            var vType = typeof val;
            if (vType === 'number' || vType === 'string' || vType === 'boolean') {
              scannedVars.push({ id: i, name: name, value: val, type: vType });
            }
          }
        }
      }

      if (typeof $gameSwitches !== 'undefined' && $gameSwitches && $gameSwitches._data) {
        var sData = $gameSwitches._data;
        var sNames = (typeof $dataSystem !== 'undefined' && $dataSystem && $dataSystem.switches) ? $dataSystem.switches : [];
        for (var j = 1; j < sData.length; j++) {
          var sVal = sData[j];
          if (sVal !== undefined && sVal !== null) {
            var sName = (sNames[j] && typeof sNames[j] === 'string' && sNames[j].trim()) ? sNames[j].trim() : ('Switch ' + j);
            scannedSwitches.push({ id: j, name: sName, value: Boolean(sVal) });
          }
        }
      }
    } catch(e) {}
    return { variables: scannedVars, switches: scannedSwitches };
  }

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
        
        var scanned = scanVariablesAndSwitches();

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
          allDbItems: allDbItems,
          variables: scanned.variables,
          switches: scanned.switches
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
                  if (cmd && typeof cmd.code === 'string') {
                    (new Function(cmd.code))();
                  } else if (cmd && cmd.comando === 'set_var') {
                    if (typeof $gameVariables !== 'undefined' && $gameVariables.setValue) {
                      $gameVariables.setValue(cmd.id, cmd.valor);
                    }
                  } else if (cmd && cmd.comando === 'set_switch') {
                    if (typeof $gameSwitches !== 'undefined' && $gameSwitches.setValue) {
                      $gameSwitches.setValue(cmd.id, Boolean(cmd.valor));
                    }
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
