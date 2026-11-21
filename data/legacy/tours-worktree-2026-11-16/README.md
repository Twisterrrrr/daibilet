# Legacy Tours working tree snapshot

This archive preserves the uncommitted state found in `D:\coding\tours` on 2026-11-16 before restoring its tracked files and removing duplicate untracked working files.

- `tracked-worktree.patch` contains the binary Git diff against the Tours checkout's HEAD.
- `untracked/` preserves every ordinary untracked file except the TEP token and registered worktrees.
- `manifest.json` records SHA-256 and size for the patch and copied files.
- Environment files and the TEP token were deliberately excluded. Registered nested worktrees remain in the Tours checkout.

This is a historical recovery archive, not source to merge into the active application.
