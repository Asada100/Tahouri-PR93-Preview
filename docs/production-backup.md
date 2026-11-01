# Tahouri Production Backup

Production backup flow:

1. The scheduler runs `backup-db.js` at startup and every `TAHOURI_BACKUP_INTERVAL_HOURS` (default 24).
2. `VACUUM INTO` creates a standalone SQLite backup.
3. The backup is checked with SQLite integrity and required-table validation.
4. The backup is signed with the dedicated backup signing private key.
5. The backup and its `.sig` file are copied to the independent off-site SSH destination.
6. Verification and restore rehearsal can validate the off-site copy with the backup signing public key.

Required production configuration:

- `TAHOURI_BACKUP_SIGNING_PRIVATE_KEY_FILE`
- `TAHOURI_BACKUP_SIGNING_PUBLIC_KEY_FILE`
- `TAHOURI_BACKUP_OFFSITE_HOST`
- `TAHOURI_BACKUP_OFFSITE_USER`
- `TAHOURI_BACKUP_OFFSITE_DIR`
- `TAHOURI_BACKUP_OFFSITE_SSH_KEY_FILE`

The off-site SSH key must be restricted to the backup destination. The remote account should have write access only to the backup directory and should not have interactive shell or administrative privileges where the hosting provider supports such restrictions.

Manual commands:

- `npm run backup`
- `npm run offsite-backup`
- `npm run verify-backup -- <backup.sqlite>`
- `npm run restore-rehearsal -- <backup.sqlite>`

Production release requirements:

- off-site destination is on infrastructure independent of the application host;
- backup signing private key is not stored in the repository or application image;
- SSH private key is not stored in the repository or application image;
- a successful backup/recovery test exists in CI;
- periodically perform a real restore rehearsal from the off-site copy.
