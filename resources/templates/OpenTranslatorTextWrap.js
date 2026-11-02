/* OpenTranslator: pixel-measured dialogue wrapping for RPG Maker MV/MZ. */
(function () {
    "use strict";
    if (typeof Window_Message !== "function") return;
    var proto = Window_Message.prototype;
    if (proto._openTranslatorPixelWrap) return;
    var original = proto.processCharacter;
    if (typeof original !== "function") return;
    Object.defineProperty(proto, "_openTranslatorPixelWrap", { value: true });
    proto.processCharacter = function (state) {
        if (state && state.text && this.contents && !state.rtl) {
            var character = state.text.charAt(state.index);
            if (character && character.charCodeAt(0) >= 32 && !/\s/.test(character)) {
                var buffered = typeof state.buffer === "string" ? state.buffer : "";
                var position = state.x + (buffered ? this.textWidth(buffered) : 0);
                var left = typeof state.startX === "number" ? state.startX : 0;
                var width = this.contents.width;
                var preceding = state.index ? state.text.charAt(state.index - 1) : "";
                var boundary = !preceding || /[\s\]]/.test(preceding);
                var nextWord = state.text.slice(state.index).match(/^[^\s\x1b]+/);
                var needed = this.textWidth(boundary && nextWord ? nextWord[0] : character);
                // Very long words still wrap at character boundaries.
                if (needed > width - left) needed = this.textWidth(character);
                if (position > left && position + needed > width) {
                    if (typeof this.flushTextState === "function") this.flushTextState(state);
                    this.processNewLine(state);
                    // A new message page must wait without consuming its first character.
                    if (this.pause) return;
                }
            }
        }
        return original.call(this, state);
    };
})();
