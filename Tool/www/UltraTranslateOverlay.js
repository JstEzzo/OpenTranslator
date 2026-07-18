//=============================================================================
// UltraTranslateOverlay.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Runtime translation overlay (Ultra Renpy Translator).
 * @author Ultra Renpy Translator
 *
 * @help
 * Generated automatically. Loads data/UltraTranslations.json and hooks
 * engine rendering functions to translate text on the fly.
 *
 * Lookup is lenient: tries direct match, trim, then a "normalized" form
 * (escape codes + whitespace stripped) so a single dict entry covers
 * many runtime variants.
 *
 * Loaded LAST so its hooks wrap any other plugin's overrides.
 */

(function() {
    'use strict';

    var DICT_PATH = 'data/__DICT_FILENAME__';
    var $ultraDict = Object.create(null);     // exact key
    var $ultraNorm = Object.create(null);     // normalized key
    var $ultraDictReady = false;

    // ── Normalizacion para lookup tolerante ─────────────────────────────
    // Strips RPG Maker escape codes (\V[N], \C[N], \I[N], \!, \., \|, \{, \}),
    // colapsa whitespace, lowercases. Permite que el dict matchee variantes
    // del mismo texto que el juego compone con escape chars en runtime.
    // BUG-23 fix: removido el "?" optional despues de [A-Za-z!.|<>{}^].
    // Antes hacia que un backslash solo (sin char siguiente) fuera matched
    // y eliminado en la normalizacion (rompiendo strings tipo "C:\\Users\\..").
    var ESCAPE_RE = /\x1b[A-Za-z]+(\[[^\]]*\])?|\\[A-Za-z!\.\|\<\>\{\}\^](\[[^\]]*\])?|\$[A-Za-z]+\[[^\]]*\]/g;
    var WS_RE = /\s+/g;
    function norm(s) {
        if (!s) return '';
        return String(s).replace(ESCAPE_RE, '').replace(WS_RE, ' ').trim().toLowerCase();
    }

    // ── Carga del diccionario ───────────────────────────────────────────
    function loadDict() {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', DICT_PATH, true);
            xhr.overrideMimeType('application/json');
            xhr.onload = function() {
                if (xhr.status < 400) {
                    try {
                        var raw = JSON.parse(xhr.responseText);
                        for (var k in raw) {
                            if (Object.prototype.hasOwnProperty.call(raw, k)) {
                                var v = raw[k];
                                $ultraDict[k] = v;
                                var t = String(k).trim();
                                if (t !== k && !(t in $ultraDict)) $ultraDict[t] = v;
                                var n = norm(k);
                                if (n.length >= 2 && !(n in $ultraNorm)) $ultraNorm[n] = v;
                            }
                        }
                        $ultraDictReady = true;
                        console.log('[UltraTranslateOverlay] dict loaded',
                                    Object.keys($ultraDict).length, 'entries (',
                                    Object.keys($ultraNorm).length, 'normalized)');
                    } catch (ex) {
                        console.error('[UltraTranslateOverlay] parse error', ex);
                        // BUG-F fix: marcar ready aunque parse falle, para que
                        // tr() actue como passthrough (juego corre sin traducir)
                        // en lugar de quedar bloqueado en estado pre-init.
                        $ultraDictReady = true;
                    }
                } else {
                    console.warn('[UltraTranslateOverlay] HTTP', xhr.status, 'fetching', DICT_PATH);
                    // BUG-F fix: marcar ready aunque HTTP falle (404, etc.)
                    $ultraDictReady = true;
                }
            };
            xhr.onerror = function() {
                console.warn('[UltraTranslateOverlay] xhr error', DICT_PATH);
                // BUG-F fix: marcar ready aunque xhr falle (red, etc.)
                $ultraDictReady = true;
            };
            xhr.send();
        } catch (ex) {
            console.error('[UltraTranslateOverlay] loadDict failed', ex);
        }
    }
    loadDict();

    // ── Lookup permisivo (3 etapas) ─────────────────────────────────────
    function tr(text) {
        if (!$ultraDictReady) return text;
        if (text === null || text === undefined) return text;
        if (typeof text !== 'string') return text;
        if (text.length === 0) return text;
        // Etapa 1: match exacto
        var hit = $ultraDict[text];
        if (hit !== undefined) return hit;
        // Etapa 2: trim
        var trimmed = text.trim();
        if (trimmed !== text) {
            hit = $ultraDict[trimmed];
            if (hit !== undefined) {
                var leading = text.match(/^\s*/)[0];
                var trailing = text.match(/\s*$/)[0];
                return leading + hit + trailing;
            }
        }
        // Etapa 3: normalizado (sin escape codes, lowercase, ws colapsado)
        var n = norm(text);
        if (n.length >= 2) {
            hit = $ultraNorm[n];
            if (hit !== undefined) return hit;
        }
        return text;
    }

    // ── Hooks principales ───────────────────────────────────────────────
    // 1. Window_Base.convertEscapeCharacters — entrada de mensajes
    if (typeof Window_Base !== 'undefined' && Window_Base.prototype.convertEscapeCharacters) {
        var _orig_cec = Window_Base.prototype.convertEscapeCharacters;
        Window_Base.prototype.convertEscapeCharacters = function(text) {
            return _orig_cec.call(this, tr(text));
        };
    }

    // 2. Window_Base.drawTextEx
    if (typeof Window_Base !== 'undefined' && Window_Base.prototype.drawTextEx) {
        var _orig_dte = Window_Base.prototype.drawTextEx;
        Window_Base.prototype.drawTextEx = function(text, x, y, width) {
            return _orig_dte.call(this, tr(text), x, y, width);
        };
    }

    // 3. Bitmap.drawText — catch-all bajo nivel
    if (typeof Bitmap !== 'undefined' && Bitmap.prototype.drawText) {
        var _orig_bdt = Bitmap.prototype.drawText;
        Bitmap.prototype.drawText = function(text, x, y, maxWidth, lineHeight, align) {
            return _orig_bdt.call(this, tr(typeof text === 'string' ? text : String(text)),
                                  x, y, maxWidth, lineHeight, align);
        };
    }

    function autoWrap(text, maxChars) {
        if (!text || typeof text !== 'string') return text;
        if (text.includes('\n')) {
            return text.split('\n').map(function(line) { return autoWrap(line, maxChars); }).join('\n');
        }
        if (text.length <= maxChars) return text;
        
        var words = text.split(' ');
        var lines = [];
        var currentLine = "";
        
        for (var i = 0; i < words.length; i++) {
            var word = words[i];
            if ((currentLine + word).length > maxChars) {
                if (currentLine) {
                    lines.push(currentLine.trim());
                    currentLine = word + " ";
                } else {
                    lines.push(word);
                    currentLine = "";
                }
            } else {
                currentLine += word + " ";
            }
        }
        if (currentLine) {
            lines.push(currentLine.trim());
        }
        return lines.join('\n');
    }

    // 4. Game_Message.add — antes del pipeline de mensajes
    if (typeof Game_Message !== 'undefined' && Game_Message.prototype.add) {
        var _orig_add = Game_Message.prototype.add;
        Game_Message.prototype.add = function(text) {
            var translated = tr(text);
            var wrapLimit = __WORD_WRAP_LIMIT__;
            if (wrapLimit > 0 && translated && translated.length > wrapLimit) {
                translated = autoWrap(translated, wrapLimit);
            }
            return _orig_add.call(this, translated);
        };
    }

    // ── G.4: Hooks adicionales para casos especificos ───────────────────

    // 5. Game_Message.setChoices — texto de las opciones (antes de mostrar)
    if (typeof Game_Message !== 'undefined' && Game_Message.prototype.setChoices) {
        var _orig_sch = Game_Message.prototype.setChoices;
        Game_Message.prototype.setChoices = function(choices, defaultType, cancelType) {
            var translated = (choices || []).map(function(c) {
                return typeof c === 'string' ? tr(c) : c;
            });
            return _orig_sch.call(this, translated, defaultType, cancelType);
        };
    }

    // 6. Game_Map.displayName — nombre del mapa que aparece al entrar
    if (typeof Game_Map !== 'undefined' && Game_Map.prototype.displayName) {
        var _orig_dn = Game_Map.prototype.displayName;
        Game_Map.prototype.displayName = function() {
            return tr(_orig_dn.call(this));
        };
    }

    // 7. Window_NameBox.setName — nombre del speaker en cuadros de dialogo
    if (typeof Window_NameBox !== 'undefined' && Window_NameBox.prototype.setName) {
        var _orig_sn = Window_NameBox.prototype.setName;
        Window_NameBox.prototype.setName = function(name) {
            return _orig_sn.call(this, tr(name));
        };
    }

    // 8. Window_ChoiceList.commandName — texto que renderiza cada opcion
    if (typeof Window_ChoiceList !== 'undefined' && Window_ChoiceList.prototype.commandName) {
        var _orig_ccn = Window_ChoiceList.prototype.commandName;
        Window_ChoiceList.prototype.commandName = function(index) {
            return tr(_orig_ccn.call(this, index));
        };
    }

    // 9. Window_ScrollText.refresh — Show Scroll Text (cinematicas)
    if (typeof Window_ScrollText !== 'undefined' && Window_ScrollText.prototype.refresh) {
        var _orig_str = Window_ScrollText.prototype.refresh;
        Window_ScrollText.prototype.refresh = function() {
            // El text esta en this._text antes del refresh; lo traducimos.
            if (typeof this._text === 'string') this._text = tr(this._text);
            return _orig_str.call(this);
        };
    }

    // 10. Window_Help.setText — descripcion de items/skills/etc.
    if (typeof Window_Help !== 'undefined' && Window_Help.prototype.setText) {
        var _orig_hst = Window_Help.prototype.setText;
        Window_Help.prototype.setText = function(text) {
            return _orig_hst.call(this, tr(text));
        };
    }

    // 11. Window_BattleLog metodos comunes (logs de combate)
    if (typeof Window_BattleLog !== 'undefined') {
        ['addText', 'push'].forEach(function(method) {
            if (typeof Window_BattleLog.prototype[method] === 'function') {
                var _orig = Window_BattleLog.prototype[method];
                Window_BattleLog.prototype[method] = function(arg) {
                    if (method === 'addText' && typeof arg === 'string') arg = tr(arg);
                    return _orig.apply(this, arguments);
                };
            }
        });
    }

    // 12. TextManager.* (constantes de UI: HP, MP, Level, etc.)
    // Reemplazamos en la primera lectura. Solo si el getter retorna string.
    if (typeof TextManager !== 'undefined') {
        var origDefineProp = false;
        try {
            // Sobrescribir las getters para devolver texto traducido
            var keys = ['hp', 'mp', 'tp', 'level', 'levelA', 'exp', 'expA',
                        'hit', 'evasion', 'gold', 'attack', 'defense', 'guard',
                        'item', 'skill', 'equip', 'status', 'formation', 'save',
                        'gameEnd', 'options', 'fight', 'escape', 'victory',
                        'defeat', 'obtainExp', 'obtainGold', 'obtainItem',
                        'levelUp', 'cancel', 'buy', 'sell', 'commandRemember'];
            keys.forEach(function(k) {
                var orig;
                try { orig = TextManager[k]; } catch(e) { return; }
                if (typeof orig === 'string' && orig.length > 0) {
                    Object.defineProperty(TextManager, k, {
                        get: function() { return tr(orig); },
                        configurable: true,
                    });
                }
            });
        } catch (ex) {
            console.warn('[UltraTranslateOverlay] TextManager hook failed', ex);
        }
    }

    // ── G/H: Hooks para LOG WINDOWS persistentes ────────────────────────
    // Plugins como MNKR_TMLogWindowMZ guardan texto en arrays de log sin
    // pasarlo por convertEscapeCharacters/drawTextEx. Hookeamos directo
    // los metodos que ALMACENAN o LEEN del log.
    //
    // IMPORTANTE: como nuestro plugin se carga AL FINAL, capturamos las
    // versiones de cada metodo despues de que los plugins de log hicieron
    // sus propios overrides. Asi nuestro tr() corre sobre el texto ANTES
    // de que el plugin lo guarde.

    // 13. Game_System.addLog — funcion estandar de plugins de log de mensajes.
    //     MNKR_TMLogWindowMZ, YEP_MessageCore variations, y otros la usan.
    //     Marcamos hookeado para que el auto-hook generico no envuelva 2 veces.
    if (typeof Game_System !== 'undefined' &&
            typeof Game_System.prototype.addLog === 'function' &&
            !Game_System.prototype._ultra_hooked_addLog) {
        var _orig_addlog = Game_System.prototype.addLog;
        Game_System.prototype._ultra_hooked_addLog = true;
        Game_System.prototype.addLog = function(text) {
            return _orig_addlog.call(this, tr(text));
        };
    }

    // 14. Game_System.actionLog — getter del array completo de log entries.
    //     Algunos plugins lo llaman para iterar al renderizar. Devolvemos
    //     un wrapper traducido (no muta el array original que se guarda en saves).
    if (typeof Game_System !== 'undefined' && typeof Game_System.prototype.actionLog === 'function') {
        var _orig_alog = Game_System.prototype.actionLog;
        Game_System.prototype.actionLog = function() {
            var arr = _orig_alog.call(this);
            if (!Array.isArray(arr)) return arr;
            return arr.map(function(item) {
                return typeof item === 'string' ? tr(item) : item;
            });
        };
    }

    // 15. Game_Message.setSpeakerName — algunos plugins de log guardan el
    //     speaker como entrada separada en el log.
    if (typeof Game_Message !== 'undefined' && Game_Message.prototype.setSpeakerName) {
        var _orig_ssn = Game_Message.prototype.setSpeakerName;
        Game_Message.prototype.setSpeakerName = function(name) {
            return _orig_ssn.call(this, tr(name));
        };
    }

    // 16. Window_MapLog.refresh — backup defensivo. Si MNKR (o similar) crea
    //     una Window_MapLog, hookeamos su refresh para capturar texto que
    //     ya esta dentro del array y se va a renderizar.
    //     Tambien cubre cualquier Window_*Log* generico (escaneo dinamico).
    function hookLogWindowRefresh(name) {
        try {
            var cls = window[name];
            if (cls && cls.prototype && typeof cls.prototype.refresh === 'function') {
                // BUG-25 fix: usar hasOwnProperty para que el marcador del
                // padre via prototype chain no bloquee hooking de subclases.
                // El marcador es por-nombre-de-clase, asi que cada clase tiene
                // el suyo, pero la lookup llega a parent.prototype via chain.
                var key = '_ultra_' + name + '_hooked';
                if (Object.prototype.hasOwnProperty.call(cls.prototype, key)) return;
                cls.prototype[key] = true;
                var _orig_refresh = cls.prototype.refresh;
                cls.prototype.refresh = function() {
                    // Pre-traducir cualquier propiedad de texto comun
                    if (typeof this._text === 'string') this._text = tr(this._text);
                    return _orig_refresh.apply(this, arguments);
                };
            }
        } catch (e) {}
    }
    // Hook nombres conocidos de plugins de log
    ['Window_MapLog', 'Window_BattleLog', 'Window_MessageLog',
     'Window_BackLog', 'Window_LogWindow', 'Window_EventLog',
     'Window_ChatLog', 'Window_RecentEvents'].forEach(hookLogWindowRefresh);

    // 17. Auto-hook generico: cualquier metodo en Game_System o Game_Party
    //     que tenga "log" en el nombre y reciba string como primer arg.
    //     Cubre nombres custom: pushLog, addToLog, addToBackLog, etc.
    function autoHookLogMethods(target, name) {
        if (!target || !target.prototype) return;
        for (var key in target.prototype) {
            // BUG-27 fix: solo iterar own properties — sin esto las propiedades
            // heredadas via prototype chain se asignan a la subclase, polluting
            // sus prototypes con wrappers no-deseados.
            if (!Object.prototype.hasOwnProperty.call(target.prototype, key)) continue;
            if (typeof target.prototype[key] !== 'function') continue;
            var lk = key.toLowerCase();
            if (lk.indexOf('log') < 0 && lk.indexOf('history') < 0 &&
                lk.indexOf('backlog') < 0) continue;
            // Skip getters obvios y nuestros propios hooks
            if (key.indexOf('_ultra_') === 0) continue;
            if (lk === 'log' || lk === 'logfor') continue;  // logger nativo de console
            // Solo hookear si el metodo es 'addLog', 'pushLog', 'logAdd', etc.
            // (que reciben texto). Skip si parece un getter o setter complejo.
            if (lk.indexOf('add') < 0 && lk.indexOf('push') < 0 &&
                lk.indexOf('append') < 0 && lk.indexOf('set') < 0 &&
                lk.indexOf('write') < 0 && lk.indexOf('record') < 0) continue;
            try {
                var orig = target.prototype[key];
                var hookKey = '_ultra_hooked_' + key;
                // BUG-26 fix: hasOwnProperty para evitar double-wrap cuando
                // la marca esta en el prototype chain pero NO en este target.
                if (Object.prototype.hasOwnProperty.call(target.prototype, hookKey)) continue;
                target.prototype[hookKey] = true;
                target.prototype[key] = function(_orig) {
                    return function(text) {
                        var args = Array.prototype.slice.call(arguments);
                        if (typeof args[0] === 'string') args[0] = tr(args[0]);
                        return _orig.apply(this, args);
                    };
                }(orig);
            } catch (e) {}
        }
    }
    if (typeof Game_System !== 'undefined') autoHookLogMethods(Game_System, 'Game_System');
    if (typeof Game_Party !== 'undefined') autoHookLogMethods(Game_Party, 'Game_Party');
    if (typeof Game_Temp !== 'undefined') autoHookLogMethods(Game_Temp, 'Game_Temp');

    // 18. Tambien hookeamos refreshes dinamicos: si un plugin define
    //     Window_*RecentEvents* o similar despues de cargado, lo capturamos.
    //     Iteramos sobre el global window object.
    try {
        Object.getOwnPropertyNames(window).forEach(function(key) {
            if (!/^Window_/.test(key)) return;
            var lk = key.toLowerCase();
            if (lk.indexOf('log') < 0 && lk.indexOf('history') < 0 &&
                lk.indexOf('recent') < 0 && lk.indexOf('event') < 0 &&
                lk.indexOf('memo') < 0 && lk.indexOf('story') < 0 &&
                lk.indexOf('chronicle') < 0 && lk.indexOf('record') < 0) return;
            hookLogWindowRefresh(key);
        });
    } catch (e) {}

// __FONT_SIZE_HOOK__
    try {
        if (typeof Window_Base !== 'undefined' && Window_Base.prototype.standardFontFace) {
            var _orig_sff = Window_Base.prototype.standardFontFace;
            Window_Base.prototype.standardFontFace = function() {
                var font = _orig_sff.call(this);
                return font + ", 'Outfit', 'Segoe UI', Arial, sans-serif";
            };
        }
        if (typeof FontManager !== 'undefined' && FontManager.standardFontFace) {
            var _orig_mz_sff = FontManager.standardFontFace;
            FontManager.standardFontFace = function() {
                var font = _orig_mz_sff.call(this);
                return font + ", 'Outfit', 'Segoe UI', Arial, sans-serif";
            };
        }
    } catch (e) {
        console.warn('[UltraTranslateOverlay] Font fallback injection failed', e);
    }

})();
