//=============================================================================
// LatinNameInput.js v1.6.0 (hook on Window_NameInput.initialize)
//=============================================================================

/*:
 * @pluguiname LatinNameInput
 * @author OpenTranslator
 * @base PluginCommonBase
 * @orderAfter PluginCommonBase
 * @title Latin Name Input
 * @desc Forces Window_NameInput table to LATIN1/LATIN2 to prevent crashes on non-CJK OS when locale is ja_JP.
 */

(() => {
    let _overrideApplied = false;
    let _cjkFontAvailableCache = null;

    function isCjFontAvailable() {
        if (_cjkFontAvailableCache !== null) {
            return _cjkFontAvailableCache;
        }
        try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                _cjkFontAvailableCache = false;
                return false;
            }
            ctx.font = "16px 'ＭＳ ゴシック', 'MS Gothic', sans-serif";
            const wA = ctx.measureText("\u3042").width;
            const wK = ctx.measureText("\u30a2").width;
            _cjkFontAvailableCache = (wA > 10 && wK > 10);
            return _cjkFontAvailableCache;
        } catch (e) {
            _cjkFontAvailableCache = false;
            return false;
        }
    }

    function applyOverride() {
        if (_overrideApplied) return;

        // $dataSystem is guaranteed to exist when Window_NameInput is being created
        const locale = ($dataSystem && $dataSystem.locale) || "";
        const isJapanLocale = /^ja/.test(locale);

        // ALWAYS force Latin name input table on ja_JP locale regardless
        // of CJK font availability. Japanese kana table causes stuck/crashes
        // on non-CJK Windows.
        if (!isJapanLocale) {
            return;
        }

        _overrideApplied = true;

        Window_NameInput.prototype.table = function() {
            return [Window_NameInput.LATIN1, Window_NameInput.LATIN2];
        };

        Window_NameEdit.prototype.charWidth = function() {
            return 14;
        };
    }

    // Hook on Window_NameInput.initialize — fires exactly when name input screen is created
    const _Window_NameInput_initialize = Window_NameInput.prototype.initialize;
    Window_NameInput.prototype.initialize = function(rect) {
        applyOverride();
        _Window_NameInput_initialize.call(this, rect);
    };
})();
