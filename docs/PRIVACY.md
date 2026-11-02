# Aster Harbor privacy policy

Maintainer: **Awais Ali Rafaqat** (GitHub: **owrew**).
Project: **Aster Harbor — X Media Harvester**.
Policy version: **1.3.0**, 3 November 2026.

## Purpose

Aster Harbor helps users save links from their own accessible X conversations and manually download available post media. It is based on Media Harvest and runs as a Chromium browser extension.

## Data the extension accesses

When used on X, the extension can inspect supported loaded post/conversation elements, relevant request URLs/responses, and post/media metadata. The native downloader can use authentication information available to the browser to request media that the signed-in user is allowed to access.

The collector can process message response data locally to identify post links. It does not intentionally store full DM transcripts; it saves post IDs/URLs, conversation identifiers, source labels, timestamps, and recovered media descriptors.

## Where information is stored

Collector preferences, links, partial checkpoints, cooldowns, and manual download-dispatch records are stored in the extension's local browser storage. The inherited downloader also uses browser-local settings, caches, and an IndexedDB download-history database.

Storage is not synced to an Aster Harbor server. The extension does not provide its own application-level encryption. Other users or software with access to the browser profile may be able to access local data.

## Network activity and third parties

X receives requests made by its own page and by explicit native video lookups/downloads. Downloaded files are handled by Edge/Chrome or the user-selected Aria2 integration.

Support links open Ko-fi or another configured provider only after a user action. The packaged badge and QR image do not load payment scripts into X. Once opened, that provider's policies apply.

The supplied local build defaults disable the upstream Sentry endpoint and contain no credentials for upstream cloud/premium services. The repository retains upstream code for those integrations; review any change that enables them and update this policy before release.

## Sharing and exports

TXT, CSV, and JSON exports are created locally at the user's request. The extension does not automatically send those exports to another person or service. Users control subsequent sharing.

## Controls and deletion

Harvesting starts stopped after refresh. Users can stop collection, disable idle detection controls, remove selected saved links, and uninstall the extension. Removing link records does not delete downloaded files. Browser profile deletion or uninstall may erase local extension data; back up first.

## What is not claimed

The extension does not guarantee that every conversation link is recovered, that all background lookups are attributable to a specific DM, that protected/deleted media can be accessed, or that X will never apply limits.

## Publication

Host this policy at an accessible public URL before submitting a store listing. Do not put a non-accessible private GitHub URL in the store's privacy-policy field. Replace project contact instructions with a stable public support channel when the repository is made public.
