# Verification guide

## Static and pure tests

~~~sh
node scripts/check-project.cjs
node --test tests/aster-core.test.cjs
~~~

These checks require Node.js only. They cover packaged-code syntax, parser properties, post-ID rejection, URL decoding, support configuration, and project metadata. They do not perform X requests.

## Native source checks

The original Yarn workspace supports:

~~~sh
yarn install --immutable
node scripts/setup-local-env.cjs
yarn check:all
yarn typecheck
yarn lint
~~~

The check:all gate covers environment declarations, localization extraction/checks, changelog, translation coverage, feature flags, and TypeScript. Keep local configuration private. Lint/format commands can update files; review the resulting diff.

## Isolated Edge tests

Build the extension, create a work/ directory, and run:

~~~sh
node tests/test-vault.cjs extension
node tests/test-interface.cjs extension
node tests/test-support.cjs extension
~~~

Playwright and installed Microsoft Edge are required. The existing tests create a fresh profile and use synthetic X pages/responses. They do not open the user's signed-in browser.

### Covered behavior

- Default stopped state and explicit mode selection.
- Stop prevents new saved links.
- Individual-video buttons remain available independently.
- Per-video dispatch through the native backend, with the browser download API mocked.
- Conversation separation, duplicate suppression, and refresh persistence.
- User-selected scrolling area, same-origin iframe selection, and manual Stop.
- Rate-limit cooldown surviving refresh.
- Library search/filtering, export, archive import, selection, and confirmed removal.
- Theme/performance preferences and page rendering.
- No collector worker messages during a short unchanged idle fixture.
- Disabling button detection without reloading X.
- Visible local Ko-fi badge, correct public URL, local QR asset, and no widget CDN load.

### Not covered

Live X authentication, actual video-file bytes, uncached lookup success for the user's account, Aria2 transfer success, all encrypted Chat formats, complete history recovery, low-end hardware performance, or store certification.

## Git verification

The one-time batch runner checks its pinned base, rejects pre-existing staged work, validates plan payloads, creates no empty commits, and verifies signatures for new commits. It writes local state under .git/ so it can detect interruption or unexpected HEAD changes.

~~~sh
node scripts/commit-features.cjs --dry-run
node scripts/commit-features.cjs --apply
git fsck --full --strict
git log --show-signature -5
~~~

Do not rerun the batch on an already completed main branch. Signed objects are not proof that each intermediate bootstrap commit is a separately installable release. The final assembled release tree receives the full functional fixtures.
