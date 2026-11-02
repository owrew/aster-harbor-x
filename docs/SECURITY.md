# Security and release boundaries

## Reporting an issue

Maintainer: Awais Ali Rafaqat, GitHub account owrew.

Use GitHub's private vulnerability reporting if enabled. Otherwise contact the maintainer privately before sharing a security issue. Do not post credentials, DM contents, session cookies, bank details, or private media URLs in an issue.

This repository is initially private. Do not treat a private issue URL as a public support or privacy-policy endpoint for store submission.

## Boundaries

- The collector handles page-world input as untrusted.
- IDs remain strings and need post-specific evidence.
- Conversation selection and epoch changes limit cross-chat collection.
- Explicit post lookups without conversation metadata remain ambiguous.
- Recovered direct-video URLs are restricted to HTTPS MP4s on video.twimg.com for manual dispatch.
- QR and support-button code are bundled; remote widget scripts are not used.
- Payment links open externally and are not proof of payout approval.
- Local browser storage has no application-level encryption.
- Download dispatch does not prove a successful media transfer.
- Rate-limit cooldowns control extension automation, not X itself.

## Secrets

.env, local profiles, build outputs, tokens, signing material, and dependencies are ignored. Use .env.example to generate local disabled defaults. Never place GitHub, X, Ko-fi, Stripe, PayPal, or store API secrets in the extension package.

The Ko-fi profile ID and QR image are public links supplied by the maintainer, not secret credentials. An inherited public X web-client constant must not be confused with a user's session token.

## Release checks

Run static checks, parser tests, and isolated browser tests. Review all manifest permissions and compiled output. Verify the ZIP root contains manifest.json and all script paths resolve. Supply a real public privacy-policy URL and MPL source access before store submission.

The development build was tested with fixtures. No live-account penetration test, complete DM recovery claim, low-end hardware certification, store certification, or payout verification is implied.
