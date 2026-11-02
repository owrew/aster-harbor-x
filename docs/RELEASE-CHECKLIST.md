# Release checklist

## Local package

- [ ] Confirm manifest numeric version increases.
- [ ] Run Node-only checks and parser tests.
- [ ] Run native workspace checks and production build.
- [ ] Run isolated browser fixtures.
- [ ] Review main-world/isolated-world script lists.
- [ ] Confirm no remote executable payment code.
- [ ] Check every referenced file exists in the final ZIP.
- [ ] Confirm secrets, local profiles, dependencies, signing material, and .env are excluded.
- [ ] Confirm the Ko-fi URL and QR point to the same profile.
- [ ] Preserve MPL notices and source availability.

## Live validation still required

- [ ] Check a small consented/non-sensitive X conversation.
- [ ] Verify Start/Stop and navigation boundaries.
- [ ] Download an accessible single video and verify the actual file.
- [ ] Check a multiple-video post.
- [ ] Check the user's selected filename/Save As/Aria2 behavior.
- [ ] Check behavior during an actual relevant rate limit without repeatedly triggering it.
- [ ] Measure CPU/memory on representative lower-end hardware.

## Store submission

- [ ] Make privacy policy and source distribution publicly reachable.
- [ ] Complete developer-account identity/security requirements.
- [ ] Review permissions and native X transaction helper behavior against current policies.
- [ ] Prepare accurate screenshots/listing/reviewer notes.
- [ ] Submit manually through the relevant store dashboard.
- [ ] Record store item IDs only after issuance.

The checklist intentionally leaves live/store checks unchecked. A passing local test suite is not evidence those activities occurred.
