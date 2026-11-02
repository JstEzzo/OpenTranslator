# Troubleshooting

## Startup fails

Keep the entire extracted portable directory together. Check the launcher diagnostics for missing files, a mismatched Node/SQLite binding, write permissions, or unavailable ports. The current portable build uses Node 24 on Windows x64. An older Node executable can break native modules.

Default ports are 8080 and 16005. Close a conflicting application through its normal controls; do not kill an unrelated process just because it owns a port. Use `--debug` for diagnostics and `--safe` for browser software rendering.

## Interface language

The application and launcher always use English. An old `lang: "pt"` setting does not switch the interface back to Portuguese. Game source and target languages remain independently configurable. Refresh an already open browser page after updating; keep the new frontend files together.

## Missing translation or cheats

Review the exact engine/version profile and optional tools in `RELEASE_MANIFEST.json`. Detection is not proof of extraction or runtime support. Check the active provider, credentials, rate limits, and whether the game's locale actually loads the generated translation. Text baked into images or compiled formats may need other work.

RPG Maker cheats need a live compatible bridge and initialized gameplay objects. A title screen may not expose party/inventory data. RenPy tools use another bridge. Unsupported engines do not gain universal cheats through the interface.

## Restore or report an error

Close the game, preserve backups and logs, and use the supported restoration operation. If restoration fails, keep the backup for recovery. Report application revision, engine version, architecture, the operation, expected/actual behavior, and relevant error details. Review diagnostic exports for personal paths and secrets before sharing them.
