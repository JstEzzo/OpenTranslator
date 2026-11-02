# User guide

## Start the application

Extract the entire Windows x64 portable ZIP and open `OpenTranslator.exe`. The interface and launcher use English on every startup, including with an older Portuguese application-language setting. This does not change the target language selected for game translation.

The launcher checks files, runtime dependencies, permissions, local ports, HTTP, frontend assets, and RPC. It opens the application once and normally moves its diagnostic panel to the Windows tray. Use **Exit OpenTranslator** from the launcher/tray for a clean shutdown.

## Add and translate a game

1. Open **Games**, select **Add game**, or drop the main game executable into the library.
2. Check the detected engine and its **Compatibility** profile. Unknown or partial support needs investigation before application.
3. Select the game translation source/target languages and provider in **Settings**. English is the interface language, not a forced game translation target.
4. Use the available translation tools for that engine. Some need additional tools or a compatible runtime bridge.
5. Test translation and restoration on an isolated copy before relying on a new version or format.

An extraction preview skips the main application stage, but extractors can create staging files. Do not treat its zero-file counter as a complete filesystem audit. A generated translation file is useful only if the game loads it.

## Reading and library settings

Text size, reduced animations, accent color, title/recency sorting, and optional path display affect this application. They do not repair every game's fonts or layout. Application language is shown as English and is independent of source/target language selectors.

## Cheats and restoration

Cheats require an active game-side bridge and supported runtime objects. RPG Maker controls and RenPy variable tools are different integrations; other engines do not automatically inherit their capabilities. Restore from a verified backup with the game closed, then check the result. See [troubleshooting](TROUBLESHOOTING.md).
