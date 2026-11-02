# Recovery and integrity

Preserve verified original files and the write plan before applying a supported change. BackupManager, apply contracts, journals, and verifiers cover different stages; their existence does not guarantee every external tool follows the same path.

Restoration must verify backup integrity, restore overwritten files, account for files created by translation, and retain recoverable evidence after an error. Close the game and test restoration on a copy. File locks, permissions, missing backups, and invalid manifests must be reported rather than converted to success.

The shutdown coordinator tracks active operations and recovery. A timeout is not permission to discard a backup or kill an unrelated process. See the operation-specific implementation and tests for its guarantees.
