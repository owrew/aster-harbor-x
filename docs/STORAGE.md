# Browser-local data model

## Aster Harbor storage

The collector uses chrome.storage.local, not a relational database. No database server or migration command is required to load the extension.

| Key | Stored value | Lifecycle |
| --- | --- | --- |
| preferences | Theme, panel placement, feature toggles, debounce, card limit, scrolling limits, support URL | Explicit settings save |
| session:TAB_ID | Selected scope, enabled flag, epoch | Reset to stopped on reload; cleared at browser startup |
| chat:SCOPE | Scope, count, creation/update times, recent IDs, optional partial checkpoint | Updated when new links arrive |
| post:SCOPE:POST_ID | Canonical URL, source label, firstSeen, recovered media | Unique per conversation/post pair |
| video:POST_ID | User-requested resolved video descriptors | Lookup cache |
| videoDownload:POST_ID:INDEX | Dispatch timestamp and status | A manual picker download |
| cooldownUntil | End of the observed cooldown | Retained across refresh |
| lastLimit | Relevant status, e.g. 429 | Diagnostics |

Example, using synthetic values:

~~~json
{
  "post:example-conversation:1234567890123456789": {
    "id": "1234567890123456789",
    "scope": "example-conversation",
    "url": "https://x.com/i/status/1234567890123456789",
    "firstSeen": 1793664000000,
    "source": "DM network",
    "media": []
  }
}
~~~

Post IDs are strings to avoid JavaScript integer precision loss. Generic user IDs, message IDs, and media IDs are not treated as posts.

## Deduplication and ordering

Uniqueness is the pair (scope, postId). A repeated ID in the same conversation updates recovered media only when it changed. The same post can appear once in each distinct conversation.

firstSeen is when this extension first saved the link. It is not the message-sent timestamp or post-created timestamp. The library sorts saved records; it does not claim to reconstruct the exact DM chronology.

The worker serializes collection writes. Manual media operations use a different queue, preserving responsive collection controls.

## Upstream storage

Media Harvest maintains its own download database through the idb library. The inspected DownloadIDB database is named download, schema version 3, with record, history, and hashtag object stores. Its repositories also maintain settings and caches through browser storage.

This layer is separate from collector chat/post keys. A collector JSON backup is not a complete backup of upstream settings, browser files, cookies, or download-history databases.

## Export and import

- TXT/CSV export the selected conversation's filtered links.
- Copy selected operates on explicitly selected records in that conversation.
- JSON backup carries collector link rows.
- Import supports this backup and readable direct-messages.js / direct-messages-group.js wrappers.
- Import strips the assignment wrapper and parses JSON; it never evaluates JavaScript.
- Encrypted or unsupported export formats cannot be decrypted by this importer.
- Imported conversations retain their own IDs.

## Deletion and retention

The library requires confirmation before removing selected saved links. It never deletes downloaded video files. A removal accepts at most 2,000 links to bound one operation.

Uninstalling, deleting an extension profile, or loading a separate unpacked installation can remove or separate stored data. Back up first. Browser-local storage is not an application-level encrypted vault; access depends on the browser profile and operating system.

## Trust boundary

Page-world events are untrusted input. The extension validates the current route, session, post-ID shape, and media host/protocol. It does not trust arbitrary generic numeric IDs or filenames supplied by a page.

Local conversation scoping is best-effort attribution, not proof of message provenance. See ARCHITECTURE.md.
