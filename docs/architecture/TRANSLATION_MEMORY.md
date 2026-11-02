# Translation memory

Translation-memory modules store and reuse text with contextual identity and scope. Legacy and newer memory paths coexist; inspect the caller before assuming an operation uses one hierarchy or database. A module name/version does not establish global migration.

Identity should preserve engine, file/location, speaker/context, and source-text information where available. Game/project/engine/global scope can reduce incorrect cross-game reuse, but ordering and lookup behavior must be verified in the active implementation.

Cache reuse is an offline capability, not a model that translates arbitrary unseen text offline. Glossary ordering reduces some overlapping-term conflicts; it does not guarantee linguistic correctness or perfect placeholder preservation. Validate imports, manual edits, and provider output before application.
