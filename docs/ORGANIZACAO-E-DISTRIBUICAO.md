# Organization and distribution

The source tree and the portable application serve different audiences. Source downloads contain development code, tests, and documentation. Portable packages contain the runtime application and its available engine resources.

## Cleanup policy

Historical audits, generated code graphs, obsolete scratch work, duplicate temporary scripts, and an incompatible legacy Node runtime were moved into verified local archives outside the product tree during the November 1, 2026 cleanup. Archive creation and hash verification preceded removal. Local archive availability is not guaranteed for someone cloning GitHub.

Personal games, saves, libraries, preferences, databases, and backups were preserved. Runtime state is excluded from new source snapshots through Git tracking and ignore rules. Removing a file from a current source snapshot does not remove it from Git history.

The maintenance cleanup tool defaults to a dry-run and requires explicit application of its plan. It must preserve protected data and keep archive/output paths outside the source tree. A file is not useless merely because a static import search did not find it.

## Distribution

The portable builder is `tools/package_release.js`. Its default `standard` profile excludes the optional native injector. The `complete` profile includes optional components found locally. No profile proves universal engine compatibility or supplies an unavailable tool.

Every package has a manifest with hashes and optional-tool availability. Do not publish local state as required product data. Keep third-party notices and runtime resources needed by their actual consumers.

## English documentation migration

The application interface, launcher, compatibility profiles, and current documentation were updated to English. Historical Portuguese reports have English status summaries and immutable links to their earlier Git revision. Their original texts are also preserved in a verified local backup. These summaries do not re-run historical experiments or endorse their old compatibility claims.

Old Portuguese filenames remain valid documentation links. Their names do not determine the interface language. Generated documentation now uses English descriptions and explicitly labels location-based inferences.
