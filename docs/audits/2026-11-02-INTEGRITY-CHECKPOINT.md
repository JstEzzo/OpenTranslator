# Integrity and translation audit checkpoint — 2026-11-02

This is an implementation checkpoint, not a certification of complete game coverage or every engine version. Private game files and extracted dialogue are excluded from the repository.

## Implemented behavior

- Backup restoration validates the requested session, paths and original hashes before writes, verifies restored files and retains recovery data on failure. Session creation refuses reuse of existing recovery metadata. Files created by a session are listed explicitly and only those files are removed on restoration.
- Unity exact player version uses the Windows native version resource rather than an arbitrary version-looking substring elsewhere in the DLL. Serialized data version remains separate evidence.
- Ruby Marshal 4.8 translation reads structural string boundaries, encoding metadata and recognized RPG fields. Scripts, technical resource names and opaque extension payloads are excluded. Unknown formats fail explicitly.
- RGSS3A extraction stages data outside the game. Index validation accepts the four-byte terminator used by real archives and rejects traversal, duplicate names, existing targets and invalid bounds. Archived resources are not blindly unpacked over existing game assets.
- Non-Japanese dialogue is no longer assumed already translated. Translation memory separates source/target locales, game identities and engine scopes in both SQLite and the in-memory fallback. Existing memory rows are retained. Locale-less local caches require explicit legacy opt-in.
- An explicitly selected provider does not silently send texts to another provider. This applies to batch translation, individual Google requests and coverage recovery. Google failures are propagated instead of being returned as successful source-text copies.
- GameMaker runtime options are excluded from localization candidates. A packed data.win without supported external localization returns an unsupported-content diagnostic. Godot executable/package content with zero supported strings remains unconfirmed. Dry-run propagates extraction failures.
- Marshal rewrites assemble unchanged byte spans once, instead of copying the whole file for every substitution.

## Evidence and limits

A controlled RGSS3A application/restoration test extracted 27,245 candidates without modifying its test installation. One controlled phrase was applied, then restoration returned all 1,148 files to their previous SHA-256 values, with no additional files remaining. This establishes a file round trip, not visual gameplay or complete translation.

Twelve isolated game installations were inspected. Extraction returned candidates for RPG Maker MV/MZ, RGSS, RenPy, Unity and Wolf. Candidate counts are not player-visible coverage. GameMaker packed data and Unreal packages require additional tooling; the Godot zero-result success was identified and corrected. Unity/Wolf candidates still require contextual classification before safe application.

A real Google-only request returned HTTP 429. No alternate service was attempted. Full provider translation and provider-throughput benchmarks remain blocked.

The structural Marshal benchmark used 100, 500 and 5,000 controlled substitutions, with three repetitions each and byte-identical outputs before/after. The measured 5,000-edit median decreased from about 23,771 ms to 4,276 ms (82% less time). The 100-edit case did not improve. Concurrent diagnostics were running; these timings are not an isolated hardware benchmark or an end-to-end translation speed claim.

A separate local UI instance verified English startup, saved 18 px text across reload, compatibility search from 22 profiles to one Unity profile, and the disconnected-cheats message. This does not certify native launch behavior or gameplay cheats.

## Format and compatibility references

- [Ruby Marshal format](https://docs.ruby-lang.org/en/2.4.0/marshal_rdoc.html)
- [Windows FileVersionInfo.ProductVersion](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.fileversioninfo.productversion)
- [RenPy translation system](https://renpy.org/doc/html/translation.html)
- [Godot 4.4 Windows export and PCK packaging](https://docs.godotengine.org/en/4.4/tutorials/export/exporting_for_windows.html)

No stable release is justified by this checkpoint. Full visual game testing, font/layout checks, save/load round trips, gameplay cheats and wider version coverage remain open.

## Godot follow-up

A real Godot 4.4.1 PCK v2 package has an encrypted directory. The diagnostic now reports `PCK_ENCRYPTED_DIRECTORY`, without treating it as an empty game. The header reader follows the engine's fixed directory layout and validates count/data bounds. The previous writer incorrectly attempted to relocate the directory through a reserved header field. That writer was removed; PCK application returns `PCK_REPACK_REQUIRED` before modifying game files. Loose CSV/PO support is unaffected. Tests cover a valid v2 fixture, encryption, invalid bounds, and refusal of unsupported writes.

Primary format reference: [Godot 4.4 PCK reader](https://github.com/godotengine/godot/blob/4.4/core/io/file_access_pack.cpp).

Final original-installation integrity check: 12 games and 69,538 files checked by SHA-256; no changed, missing or additional files. Windows/POSIX relative-path separators are normalized before comparison.
