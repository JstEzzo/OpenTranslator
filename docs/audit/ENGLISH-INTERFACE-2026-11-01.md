# English interface and documentation migration

Date: November 1, 2026.

## Behavior

The browser interface is fixed to English and does not read a stored Portuguese application-language preference. Configuration save/load keeps `lang: "en"` in the in-memory UI configuration. Source and target languages for game translation remain separate values. The HTML document declares English and its loading message is English.

Fixed interface labels, settings, compatibility descriptions, and native launcher text were translated. Technical identifiers and game text are not supposed to be translated by this migration. Font-patch examples may mention accented characters because they describe the patch's purpose.

## Documentation policy

Current guides were rewritten in English and updated against the active source. Unsupported universal compatibility, crash-containment, editor/UI, and performance promises were removed or qualified. 57 historical records now provide an English scope/limitations summary and an immutable link/hash for the complete original. This is a consolidation, not a claim that every historical experiment was re-run or every original sentence translated verbatim.

Public catalogue descriptions are editorial or explicitly inferred. Generated inventories are not semantic certification. Dependency/vendor documentation and internal source comments retain their upstream/original language where appropriate; they are not the application's interface language.

## Verification

The migration must pass JavaScript syntax/lint checks, the registered test suite, English startup regression checks, native launcher compilation, and portable packaging checks before distribution. Validation completed locally: `npm run verify` passed 620 checks in 42 suites. The launcher compiled during portable packaging; the bundled Node/SQLite/WS/ExcelJS runtime probe passed. The library, English language setting, and all compatibility profiles were checked in an isolated portable instance. These results do not certify every game or Windows machine.

## Original preservation

The prior documentation revision is `c1a30f2e05fb37b7524945114b66a212e9ff984b`. Full local pre-migration documentation/UI backups were hash-checked before edits. Original reports remain accessible through their individual immutable Git links. No game, save, translation target, or personal database was converted to English.
