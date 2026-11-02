# Chrome Web Store and Microsoft Edge Add-ons

Official documentation checked on 3 November 2026. These are submission instructions, not a claim that an account was registered, a fee was paid, or this extension was approved.

## Before either store

1. Test real signed-in X behavior with a small non-sensitive conversation.
2. Confirm individual downloads, stop behavior, and cooldown handling.
3. Review the final compiled package, not only source files.
4. Review host/optional permissions; remove anything not justified by the enabled functions.
5. Publish a reachable privacy policy and contact/support channel.
6. Make the corresponding MPL-covered source available to recipients. This repository is currently private; change that or provide an appropriate public source distribution before distributing the extension.
7. Add accurate screenshots, a description, support URL, and review instructions.
8. Clearly identify this as an independent X utility, not an official X product.
9. Use the installable extension ZIP, never the source archive or a repository ZIP.

## Chrome Web Store

### Developer account

Register a Chrome Web Store developer account, provide the requested identity/contact details, enable the required account security, and pay the one-time registration fee shown by Google. Account registration/verification is the owner's action; the extension does not do it.

https://developer.chrome.com/docs/webstore/register

### Upload

Open the Chrome Developer Dashboard, choose Add new item, and upload the extension ZIP with manifest.json at its root. Complete the listing, visibility/distribution, privacy fields, permission justifications, and reviewer instructions, then submit for review.

https://developer.chrome.com/docs/webstore/publish

### Remote code

Manifest V3 does not allow remotely hosted executable extension code. The supplied Ko-fi widget CDN script was therefore replaced with a bundled badge/QR control that opens the support page externally.

https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code

### Required review discussion

The extension observes relevant X traffic and uses a main-world transaction-ID helper. These implementation details and the private-data scope need accurate disclosure. A locally passing test does not establish store-policy compliance. Do not describe it as a rate-limit bypass, an encryption bypass, or guaranteed complete DM extraction.

## Microsoft Edge Add-ons

Register an Edge extensions developer account in Partner Center with the account/identity information Microsoft requests. Create a new extension, upload the installable ZIP, complete availability, properties, privacy, listing, and certification notes, and submit.

https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/create-dev-account
https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension

Partner Center's current interface and account requirements are authoritative. Do not assume a GitHub login alone completes identity verification.

## Permission justification draft

| Permission | Purpose / review note |
| --- | --- |
| X/Twitter host access | In-page download controls and selected-DM observation |
| storage | Preferences, saved links, cooldowns, checkpoints |
| unlimitedStorage | Large local collections and inherited caches; review necessity |
| downloads | User-requested browser video downloads |
| cookies | Inherited native authenticated X download access |
| notifications | Inherited download/error notifications |
| alarms | Inherited worker maintenance/cache tasks |
| management (optional) | Inherited companion integration; review necessity |

Use the actual final manifest. Do not claim a permission is optional or unused unless it is so in that package.

## Listing text draft

**Name:** Aster Harbor — X Media Harvester

**Short description:** Save selected DM post links locally and manually download available X post videos.

**Long description:** Aster Harbor combines per-conversation post-link collections with individual video downloads. Start and stop harvesting explicitly, retain saved links across refresh, search and export collections, import readable DM archive files, and choose an individual video to send to the browser or Aria2 downloader. The interface includes light/dark themes, compact controls, configurable detection limits, and cautious optional older-message scrolling. Collection is browser-local. Live X access, media availability, conversation attribution, and server limits still apply. The extension does not guarantee complete history recovery.

## Reviewer test notes

- The extension requires an X session for live use; do not provide personal credentials in review notes.
- Open a full DM route and use Start harvesting → Harvest DM links.
- Stop harvesting must prevent new saved links while individual download controls remain available.
- Test a normal post's Download video button and the saved-library picker.
- A lookup can fail for an inaccessible post or active cooldown.
- The Ko-fi button opens the maintainer's public page; it does not inject remote scripts or initiate a payment.
- If reviewers need a demonstration, record one with consented/synthetic content and redact private conversation data.

## After approval

Keep the assigned store item ID and update the same listing for future releases. Increment the numeric manifest version, retain source/licensing information, re-run tests, and update privacy disclosures whenever behavior changes. Store publishing and public visibility were not performed by this setup task.
