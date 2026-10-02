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
      var state = {
        scene: (typeof SceneManager !== 'undefined' && SceneManager._scene) ? SceneManager._scene.constructor.name : 'Unknown'
      };
      if (window.$gameParty && window.$gamePlayer && window.$gameSystem && window.$gameMap) {
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
            scene: state.scene,
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
        } catch(err) {}
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
                    try { (new Function(cmd.code))(); } catch (e) { logToFile('SyntaxError no cmd.code: ' + e.message); }
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

  // ===== SPEED HACK (técnica paramonos: updateScene + acumulador de taxa) =====
  // Multiplica SceneManager.updateScene com acúmulo fracionário (1.5 = 1 frame
  // extra a cada 2 frames) — suave e não dobra o CPU todo frame como 2x.
  window.__opentSpeedMult = window.__opentSpeedMult || 1.5;
  window.__opentSpeedKey = window.__opentSpeedKey || 'ControlLeft';
  window.__opentHotkeys = window.__opentHotkeys || {};
  var _opentSpeedDown = false;
  var _opentHooked = false;
  var _opentRateAccum = 0;

  function opentSpeedActive() {
    var key = window.__opentSpeedKey || 'ControlLeft';
    var mult = window.__opentSpeedMult || 1;
    return _opentSpeedDown && mult > 1;
  }

  function opentSetupSpeedHack() {
    if (typeof SceneManager === 'undefined' || !SceneManager.updateScene) return;
    var cur = SceneManager.updateScene;
    if (_opentHooked && cur === _opentSceneUpdateWrapper) return;
    var orig = cur.bind(SceneManager);
    var wrapper = function() {
      if (opentSpeedActive()) {
        var rate = window.__opentSpeedMult || 1;
        if (rate <= 1) { orig(); return; }
        _opentRateAccum += rate;
        var step = Math.floor(_opentRateAccum);
        _opentRateAccum -= step;
        if (step > 0) {
          try { orig(); } catch (e) {}
          for (var i = 0; i < step - 1; i++) {
            // atualiza input/cena nas frames extras p/ não duplicar clique
            try { if (SceneManager.updateInputData) SceneManager.updateInputData(); } catch (e) {}
            try { if (SceneManager.changeScene) SceneManager.changeScene(); } catch (e) {}
            try { orig(); } catch (e) {}
          }
        }
      } else {
        try { orig(); } catch (e) {}
      }
    };
    SceneManager.updateScene = wrapper;
    _opentSceneUpdateWrapper = wrapper;
    _opentHooked = true;
  }

  // ===== SKIP MESSAGE (acelera diálogos enquanto a tecla é segurada) =====
  var _opentSkipMsg = false;
  var _opentSkipHooked = false;
  function opentSetupSkipMessage() {
    if (_opentSkipHooked) return;
    if (typeof Window_Message === 'undefined' || !Window_Message.prototype) return;
    _opentSkipHooked = true;
    var _oUSF = Window_Message.prototype.updateShowFast;
    Window_Message.prototype.updateShowFast = function() {
      _oUSF.call(this);
      if (_opentSkipMsg) { this._showFast = true; this._pauseSkip = true; }
    };
    var _oUI = Window_Message.prototype.updateInput;
    Window_Message.prototype.updateInput = function() {
      var ret = _oUI.call(this);
      if (this.pause && _opentSkipMsg) {
        this.pause = false;
        if (!this._textState) this.terminateMessage();
        return true;
      }
      return ret;
    };
  }

  function opentHotkeyAction(action) {
    try {
      switch (action) {
        case 'victory':
          if (typeof BattleManager !== 'undefined' && SceneManager._scene instanceof Scene_Battle) {
            $gameTroop.members().forEach(function(e){ e.addNewState(e.deathStateId()); });
            BattleManager.processVictory();
          }
          break;
        case 'defeat':
          if (typeof BattleManager !== 'undefined' && SceneManager._scene instanceof Scene_Battle) {
            $gameParty.members().forEach(function(a){ a.addNewState(a.deathStateId()); });
            BattleManager.processDefeat();
          }
          break;
        case 'escape':
          if (typeof BattleManager !== 'undefined' && SceneManager._scene instanceof Scene_Battle) {
            $gameParty.performEscape(); BattleManager._escaped = true; BattleManager.processEscape();
          }
          break;
        case 'groupHp0':
          if (typeof $gameParty !== 'undefined') $gameParty.members().forEach(function(a){ a.setHp(0); });
          break;
        case 'groupHp1':
          if (typeof $gameParty !== 'undefined') $gameParty.members().forEach(function(a){ a.setHp(1); });
          break;
        case 'groupHpMax':
          if (typeof $gameParty !== 'undefined') $gameParty.members().forEach(function(a){ a.setHp(a.mhp); });
          break;
        case 'groupRecover':
          if (typeof $gameParty !== 'undefined') $gameParty.members().forEach(function(a){ a.setHp(a.mhp); a.setMp(a.mmp); if (typeof a.setTp === 'function') a.setTp(a.maxTp ? a.maxTp() : 100); });
          break;
        case 'enemyHp0':
          if (typeof $gameTroop !== 'undefined') $gameTroop.members().forEach(function(e){ e.setHp(0); });
          break;
        case 'enemyHp1':
          if (typeof $gameTroop !== 'undefined') $gameTroop.members().forEach(function(e){ e.setHp(1); });
          break;
        case 'enemyHpMax':
          if (typeof $gameTroop !== 'undefined') $gameTroop.members().forEach(function(e){ e.setHp(e.mhp); });
          break;
        case 'skipMsg':
          _opentSkipMsg = true;
          break;
      }
    } catch(e) {}
  }

  function opentHotkeyActionFor(code) {
    var hk = window.__opentHotkeys || {};
    for (var k in hk) {
      if (hk[k] === code && k !== 'speed') return k;
    }
    return null;
  }

  // ===== SMART MESSAGE WINDOW & FONT AUTO-WRAP FIX =====
  var _opentMsgFixHooked = false;
  function opentSetupMessageFix() {
    if (_opentMsgFixHooked) return;
    if (typeof Window_Message === 'undefined' || !Window_Message.prototype) return;
    _opentMsgFixHooked = true;

    // 1. Preservação de textState.left ao quebrar linha (\n) quando há Face Graphic
    var _origProcessNewLine = Window_Message.prototype.processNewLine;
    Window_Message.prototype.processNewLine = function(textState) {
      if (textState) {
        if (typeof this.newLineX === 'function') {
          textState.left = this.newLineX(textState);
        } else if (typeof $gameMessage !== 'undefined' && $gameMessage.faceName && $gameMessage.faceName()) {
          textState.left = 168; // 144px face + padding
        }
      }
      if (_origProcessNewLine) {
        _origProcessNewLine.call(this, textState);
      } else if (typeof Window_Base !== 'undefined' && Window_Base.prototype.processNewLine) {
        Window_Base.prototype.processNewLine.call(this, textState);
      }
    };

    // 2. Look-Ahead Word-Wrap no processNormalCharacter (Zero Lag & Medição Real por Espaço ' ')
    var _origProcessNormalChar = Window_Message.prototype.processNormalCharacter || (typeof Window_Base !== 'undefined' && Window_Base.prototype.processNormalCharacter);
    var _targetProto = Window_Message.prototype.processNormalCharacter ? Window_Message.prototype : (typeof Window_Base !== 'undefined' ? Window_Base.prototype : null);

    if (_targetProto && _origProcessNormalChar) {
      _targetProto.processNormalCharacter = function(a, b) {
        var c, textState;
        if (typeof a === 'string') {
          c = a;
          textState = b;
        } else {
          textState = a;
          c = (textState && textState.text && textState.index !== undefined) ? textState.text[textState.index] : '';
        }

        if (_origProcessNormalChar) {
          try {
            // Executar o Look-Ahead APENAS quando o caractere atual for um espaço em branco (' ')
            if (c === ' ' && textState && textState.text) {
              var idx = textState.index || 0;
              // Extrai a próxima palavra inteira após o espaço
              var textRem = textState.text.substring(idx + 1);
              var match = textRem.match(/^[^\s\x1b\n\f]+/);
              if (match && match[0]) {
                var nextWordClean = match[0].replace(/\\+[A-Za-z0-9_]+(\[[^\]]*\])?|\\+[{}!.\|^$><\\%]/g, '');
                var wordWidth = 0;
                if (typeof this.textWidth === 'function') {
                  try { wordWidth = this.textWidth(nextWordClean); } catch (e) { wordWidth = nextWordClean.length * 14; }
                } else {
                  var fontSz = (this.contents && this.contents.fontSize) ? this.contents.fontSize : 26;
                  wordWidth = nextWordClean.length * (fontSz * 0.55);
                }

                var maxW = this.contentsWidth ? this.contentsWidth() : (this.width ? this.width - 36 : 600);
                var limitX = maxW - 12;

                var maxH = this.contentsHeight ? this.contentsHeight() : (this.height ? this.height - 36 : 180);
                var canWrap = (textState.y + (textState.height || 36) * 1.5) < maxH;

                if (canWrap && (textState.x + wordWidth + 8 > limitX)) {
                  this.processNewLine(textState);
                  if (typeof a !== 'string') {
                    textState.index++;
                  }
                  return;
                }
              }
            }
          } catch (wrapErr) {}

          _origProcessNormalChar.call(this, a, b);
        }
      };
    }

    // 3. Ajuste de Tamanho de Fonte com Piso Seguro (MIN_FONT_SIZE = 14)
    var _origStartMessage = Window_Message.prototype.startMessage;
    Window_Message.prototype.startMessage = function() {
      if (_origStartMessage) _origStartMessage.call(this);
      if (this._textState && this._textState.text && this.contents) {
        var lines = this._textState.text.split('\n');
        var MIN_FONT_SIZE = 14;
        if (lines.length > 4) {
          var origSize = this.contents.fontSize || 26;
          var scaledSize = Math.max(MIN_FONT_SIZE, Math.floor(origSize * (4 / lines.length)));
          this.contents.fontSize = scaledSize;
        }
      }
    };
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', function(e) {
      if (e.code === (window.__opentSpeedKey || 'ControlLeft')) {
        _opentSpeedDown = true;
        _opentSkipMsg = true; // control também acelera/pula diálogos
      }
      var act = opentHotkeyActionFor(e.code);
      if (act) opentHotkeyAction(act);
    }, true);
    document.addEventListener('keyup', function(e) {
      if (e.code === (window.__opentSpeedKey || 'ControlLeft')) {
        _opentSpeedDown = false;
        _opentSkipMsg = false;
      }
      var act = opentHotkeyActionFor(e.code);
      if (act === 'skipMsg') {
        _opentSkipMsg = false;
      }
    }, true);
    window.addEventListener('blur', function() {
      _opentSpeedDown = false;
      _opentSkipMsg = false;
    }, true);
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) { _opentSpeedDown = false; _opentSkipMsg = false; }
    }, true);
  }
  function opentSetupItemCategoryFix() {
    if (typeof Window_ItemCategory === 'undefined' || !Window_ItemCategory.prototype) return;
    if (Window_ItemCategory.prototype._opentCategoryHooked) return;
    Window_ItemCategory.prototype._opentCategoryHooked = true;

    var _orig_addItemCategory = Window_ItemCategory.prototype.addItemCategory;
    if (typeof _orig_addItemCategory === 'function') {
      var categoryTranslations = {
        'Food': 'Comida',
        'Elixirs': 'Elixires',
        'Mystic Tools': 'Ferramentas Místicas',
        'Memories': 'Memórias',
        'Upgrade Materials': 'Materiais de Aprimoramento',
        'Support Items': 'Itens de Suporte',
        'Alcohol': 'Bebidas',
        'Enchant Materials': 'Materiais de Encantamento',
        'Faith Fragments': 'Fragmentos de Fé',
        'Valuables': 'Objetos de Valor',
        'Tickets': 'Bilhetes',
        'Information': 'Informações',
        'Collectibles': 'Colecionáveis',
        'Herbs': 'Ervas',
        'Potions': 'Poções'
      };
      Window_ItemCategory.prototype.addItemCategory = function(category) {
        if (category && typeof category === 'string' && category.match(/Category:(.*)/i)) {
          var type = String(RegExp.$1);
          var displayName = categoryTranslations[type] || type;
          return this.addCommand(displayName, 'Category', true, type);
        }
        return _orig_addItemCategory.call(this, category);
      };
    }
  }

  setTimeout(opentSetupSpeedHack, 2500);
  setTimeout(opentSetupSkipMessage, 2500);
  setTimeout(opentSetupMessageFix, 2500);
  setTimeout(opentSetupItemCategoryFix, 2500);
  setInterval(opentSetupSpeedHack, 5000);
  setInterval(opentSetupMessageFix, 5000);
  setInterval(opentSetupItemCategoryFix, 5000);
  pollCheat();
})();

