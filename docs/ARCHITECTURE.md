# Architecture

## System boundary

Aster Harbor is a Chromium Manifest V3 browser extension. Its user interface runs in extension pages and an isolated X content script. Page-network observation runs in the main world because the isolated world cannot replace X's own fetch function.

There is no application server, SQL database, user registration service, or extension-hosted payout processor. The upstream downloader contains optional cloud integrations, but this distribution supplies no credentials and disables its Sentry endpoint in local build defaults.

~~~text
X / Twitter page
  |
  +-- main world
  |    +-- extract.js: bounded post-ID and URL decoding
  |    +-- network.js: observe supported fetch/XHR responses
  |    +-- inject.js: upstream transaction-ID integration
  |              |
  |         page message bridge
  |              |
  +-- isolated world
       +-- content.js: scope, Start/Stop, bounded decoration
       +-- panel-ui.js: in-page controls
       +-- media-ui.js: individual-video picker
       +-- session-bridge.js: manual lookup transaction request
       +-- support.js: local badge and local QR image
                  |
          extension runtime messages
                  |
       vault-sw.js (service-worker entry)
          +-- sw.js: Media Harvest native services
          |     +-- lookup and filename templates
          |     +-- browser / Aria2 dispatch
          |     +-- upstream download history and events
          |
          +-- background.js
                +-- short storage/control queue
                +-- separate manual-media queue
                +-- scope validation and cooldown
                +-- browser-local persistence
~~~ 

## Why there are two parsers

The main and isolated execution worlds each need their own parser. The integration script copies extract.js to extract-isolated.js for the isolated world. Do not let these files diverge. Keeping distinct script URLs avoids the cross-world injection issue encountered during testing.

## Request attribution

The controller requires an explicitly selected top-level DM route before saving links. Known conversation IDs in request variables must match that selected DM. Generic inbox responses without matching conversation context are skipped.

GetPostById requests provide an explicit post ID. That reference can be saved without another lookup, including when the response is rate-limited. The controller rejects responses after a route/session epoch change.

A lookup without conversation metadata can still be a background prefetch. Association with the active DM is not proof of a particular message's provenance. The extension cannot guarantee exhaustive or perfect message-level attribution.

## Manual downloads

Download buttons remain available while harvesting is stopped. The picker first checks recovered video data. Find videos explicitly invokes the upstream native lookup with an available signed-in X tab. A chosen video is passed to the original browser/Aria2 downloader.

Recovered MP4 data without a complete post object uses a deterministic filename. A full native lookup can use upstream filename templates. User-requested download dispatch is not equivalent to successful transfer completion.

## Work scheduling

- No recurring collector page-scan interval.
- Changes are coalesced by a configurable debounce.
- A capped number of recognized cards is processed per scan.
- Hidden tabs disconnect the collector DOM observer and stop automatic scrolling.
- Summary messages read only the active session/chat and a small recent subset.
- Duplicate observations do not rewrite unchanged post records.
- Media lookup uses a separate queue so it cannot block Stop harvesting.
- The inherited worker and its own browser lifecycle tasks may still wake independently.

## Store and privacy boundaries

The support badge uses bundled code and a bundled QR image. Only an explicit click opens Ko-fi. No widget CDN or embedded checkout is loaded in X.

The source includes upstream code, not a guarantee of store approval. Read STORE-PUBLISHING.md before distributing and preserve MPL source availability.
