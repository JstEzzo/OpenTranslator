# Engine adapter API

Adapters inherit from `src/core/baseEngineAdapter.js` and are registered in `src/core/engineRegistry.js`. Read the current base contract and a tested adapter before adding a new engine.

Typical operations include detection, inspection, extraction, capability reporting, validation, application, and rollback. A method existing or returning `{success: true}` is not evidence of implemented behavior. Returning an always-valid QA result does not validate a translation.

Extraction must distinguish empty input from failed or incomplete parsing. Application must report actual writes and errors; preserve archive metadata and tokens. Integrate backup/write contracts where required and test restoring originals and removing created files. Registration must not promote experimental support to universal compatibility.

Use fixtures covering malformed input, duplicate contexts, encoding, placeholders, format round trips, partial failure, and recovery. Document the versions/architectures actually tested and the optional tools required.
