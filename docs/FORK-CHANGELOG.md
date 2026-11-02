# Fork milestones

These are local development milestones, not previously published store releases.

## 1.3.0 — Aster Harbor

- Added maintainer-supplied Ko-fi profile, bundled badge, and expandable local QR.
- Matched the QR to the public profile through local decoding.
- Added the Aster Harbor codename and Awais Ali Rafaqat maintainer credit.
- Preserved actual upstream history and grouped actual fork snapshots into signed commits.
- Added architecture/storage/privacy/security/store documentation.
- Added a guarded one-time batch-commit runner, core tests, read-only CI, and package validation.

## 1.2.0 — Interface and idle-work reduction

- Replaced recurring collector scans with debounced page events.
- Scoped panel storage reads and suppressed unchanged record rewrites.
- Added themed pages, controls, selection/removal, and performance preferences.
- Removed the legacy whole-page observer from the active manifest.
- Kept the native worker/settings and a smaller manual-lookup helper.

## 1.1.0 — Manual individual-video workflow

- Added a picker for individual videos and a native Media Harvest bridge.
- Added download controls independent of Start/Stop harvesting.
- Made collection stopped after refresh while retaining saved links.
- Added regular-post and saved-library controls.

## 1.0.0 — Persistent DM collections

- Added selected-conversation storage and duplicate suppression.
- Added bounded network observation, explicit post-reference extraction, and decoding.
- Added optional cautious scrolling, cooldowns, exports, and readable archive import.

The original upstream changelog is retained at the repository root.
