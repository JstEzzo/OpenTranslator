# Font compatibility

Keep the game's original font when it contains the required glyphs and renders correctly. Unicode character classification, a font filename, and a recommendation are not proof of actual glyph coverage or successful font installation in a game.

The application uses UI font resources under `ui/NotoSans` as applicable. Game font patches are engine-specific. Noto Sans Regular is not a universal font for every script; CJK, Arabic, fallback chains, shaping, and engine import settings need separate checks.

Record the exact font, license, engine version, locale, fallback configuration, and visual result. Application text-size preferences change the OpenTranslator interface, not all game text.
