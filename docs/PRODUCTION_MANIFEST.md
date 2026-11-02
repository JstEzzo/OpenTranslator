# Portable production manifest specification

The authoritative file list for a build is its generated `RELEASE_MANIFEST.json`, not historical folder sizes or locally populated translation databases.

## Build and runtime

- Windows x64 and Node 24 are required by the current portable runtime probe.
- `OpenTranslator.exe` is compiled from `launcher/OpenTranslatorLauncher.cs`.
- `bin/node.exe` runs `server.js`; frontend assets are in `ui/`.
- Runtime npm dependencies include better-sqlite3, ws, and ExcelJS. The native SQLite binding must match the bundled Node ABI; an old Node 20 binary is not an interchangeable fallback.
- Product source, configuration, resources, and required third-party licenses accompany the application.
- The launcher and application interface are English. Game translation languages are independent settings.

## Profiles

`standard` is the default profile and excludes `loaders/inject.exe`. `complete` includes optional components present in the build source. Neither profile downloads missing engine tools automatically. Components such as the Godot extractor may be absent; the manifest records optional tool availability.

## Exclusions

Games, saves, personal libraries, caches, logs, local settings, historical archives, test scripts, and unused dependency build sources do not belong to the runtime bundle. User-populated translation databases are not mandatory product assets. Empty writable state directories can be created as needed.

## Commands and checks

```powershell
npm ci
npm run verify
npm run package:portable -- --output ..\OpenTranslator-portable
```

The destination must be new and outside the source tree. The builder validates required files and performs an actual SQLite transaction, loads WS, and round-trips an Excel workbook with the packaged runtime. It records file hashes and component availability. The release workflow smoke-tests a separate copy before archiving the package.

Package size depends on the revision and profile. A smoke test confirms startup checks in a particular environment; it does not certify all games or every Windows installation.
