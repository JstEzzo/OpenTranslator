# Patch and recovery system

Patch schema, installer, backup manager, transaction journal, and apply verifier serve different purposes. Read the current parser and migration code for the supported schema versions; an old report's version label is not authoritative.

A patch should identify target files, source revision/hashes where required, translated records, metadata, and its write plan. Verify source compatibility before replacement. Backups must remain usable after partial failure; recovery should account for both overwritten and newly created files.

Round-trip format parsing, correct placeholders, actual file writes, and successful restoration are separate checks. A successful patch parser does not prove every engine adapter or external process uses the same transaction path. Close the game and test on an isolated copy before application to an important installation.
