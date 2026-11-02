# History and attribution

The repository begins with the genuine upstream Media Harvest v4.5.7 history:

- Repository: https://github.com/EltonChou/TwitterMediaHarvest
- Pinned tag: v4.5.7
- Pinned commit: 2216b2d994b9fc5ee0eaa91686cb39c5d8c638a4
- Reachable upstream commits at that base: 2,118
- Original author: Elton H.Y. Chou and upstream contributors
- License: Mozilla Public License 2.0

Those commits retain their original authors, dates, messages, and identities. They are not new commits by Awais Ali Rafaqat.

The user-supplied source snapshot differed from the public tag in a small set of source/dependency files. The fork imports that snapshot explicitly, then adds the actual collector milestones preserved in the local v1.0, v1.1, and v1.2 source artifacts.

The batch commit plan stages those real snapshots in feature-sized groups, followed by the current Ko-fi, documentation, release tooling, and validation changes. It does not backdate new work, generate empty commits, or pretend every intermediate bootstrap commit is an installable release.

The final assembled tree is the release candidate that receives the browser tests. New fork commits use the maintainer's configured signing key, and the batch runner verifies their signatures locally. GitHub's Verified label also depends on the signing key being registered to the appropriate account.

See scripts/commit-features.cjs for dry-run/apply behavior. The plan is one-time history preparation from the pinned base; rerunning it on the completed main branch is intentionally rejected.
