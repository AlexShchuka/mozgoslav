# Mobile sync setup

> ADR-003 R9 — how to pair your phone with the Mozgoslav desktop app so
> recordings made on the go show up automatically in the Mac UI, and
> notes written in Obsidian Mobile stay in sync with the desktop vault.

Mozgoslav embeds [Syncthing](https://syncthing.net/) for peer-to-peer
file sync. No cloud account, no server — only the two devices you pair
ever see the files. Bytes are encrypted in transit.

Three folders are shared:

| Folder ID                      | Purpose                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| `mozgoslav-recordings`         | Voice memos captured on the phone, imported into the desktop |
| `mozgoslav-notes`              | Markdown notes exported by Mozgoslav                         |
| `mozgoslav-obsidian-vault`     | Your full Obsidian vault (optional — only if enabled in Settings) |

## 1. Desktop — open the pairing screen

1. Launch Mozgoslav.
2. Open **Settings → Sync**.
3. The QR code shown on that screen encodes your desktop's Syncthing
   device ID and the three folder IDs. Keep it open.

Under the hood the desktop generates a URI of the form

```
mozgoslav://sync-pair?deviceId=<DESKTOP-DEVICE-ID>&folderId=mozgoslav-recordings,mozgoslav-notes,mozgoslav-obsidian-vault&vaultEnabled=true
```

— both the companion app flow and the manual setup below need the
`deviceId` from this URI.

## 2. Android — Syncthing-Fork

The upstream Syncthing Android app is no longer maintained; use the
actively-maintained fork:

- Package: [`com.github.catfriend1.syncthingandroid`](https://github.com/Catfriend1/syncthing-android)
- Play Store / F-Droid: search for "Syncthing-Fork" (Catfriend1).

### Pair

1. Install Syncthing-Fork and open it. On first launch it generates a
   device ID for the phone.
2. Menu → **Show device ID** — or tap the QR icon to scan directly.
3. On the desktop, accept the pending device prompt that appears in
   Mozgoslav (or in the native Syncthing UI at `http://127.0.0.1:<port>`).
   Mozgoslav will pre-share the three mobile folders automatically.
4. Back in Syncthing-Fork, accept the incoming folder invitations.
   Choose a folder on the phone where recordings / notes will live —
   `Internal storage/Mozgoslav/` is a good default.

### Recording on the phone

- Use any voice-memo app that can save to the `mozgoslav-recordings`
  folder (the default Recorder app works, or use
  [Easy Voice Recorder](https://play.google.com/store/apps/details?id=com.coffeebeanventures.easyvoicerecorder)).
- Save recordings as `.m4a`, `.mp3`, or `.wav`. Mozgoslav imports
  anything ffmpeg can decode.
- The desktop picks up new files within seconds and queues them for
  transcription.

### Obsidian vault (optional)

If `vaultEnabled=true` was reported above, point Obsidian Mobile at the
same `mozgoslav-obsidian-vault` directory — vault name, plugins and all.
Edits made on either side converge in seconds.

## 3. iOS — Möbius Sync

Syncthing itself doesn't publish an iOS app; the community-maintained
Möbius Sync is the best option today.

- App Store: [Möbius Sync](https://apps.apple.com/us/app/möbius-sync/id1539203216).
- Free for one folder; the paid tier unlocks all three.

### Pair

1. Install Möbius Sync and grant local-network permission so it can
   reach the desktop on your LAN.
2. Settings → **My Device ID** → share via QR.
3. Desktop: same as Android step 3 above — accept the pending device
   in Mozgoslav, then accept the incoming folder invitations on the
   phone.
4. Möbius Sync stores shared folders inside the app's Files document
   container (`On My iPhone → Möbius Sync`). Point your voice-recorder
   and Obsidian Mobile there.

### Alternative — synctrain

[synctrain](https://github.com/pixelspark/sushitrain) is an
open-source TestFlight-only client. Same pairing flow. Recommended if
you already have a TestFlight Apple ID and prefer 100% open source.

## Troubleshooting

### The phone never appears as a pending device

- Both phone and desktop must be on the same Wi-Fi subnet on first
  pairing (they can roam to different networks once paired — Syncthing
  uses global discovery by default).
- Phone firewall or "strict NAT" captive portals block the discovery
  broadcast. Turn off Wi-Fi → use mobile data hotspot as a test.

### Files appear on one side but not the other

Check folder state in the desktop's **Settings → Sync** panel:

- `error` → click into the folder, review the error string. Usually
  a permissions problem on the mobile side.
- `syncing` for > 10 min on a small folder → kill the Syncthing process
  on the phone and restart. Upstream has a known re-hash bug after
  OS-level file moves.

### I see `.sync-conflict-<timestamp>-<device>.md` files

Both sides edited the same note at the same time. Mozgoslav surfaces
these files in the UI with a **Resolve conflict** prompt — pick the
version you want to keep, or open both and merge by hand.

### I want to pause sync

- Desktop: **Settings → Sync → Pause all folders**.
- Phone: Syncthing-Fork has a pause toggle in the notification.

Pausing suspends upload/download; queued changes resume cleanly when
you un-pause.

## Privacy notes

- All three folders live only on your paired devices. Syncthing's
  global discovery servers learn your device ID and IP but not the
  folder contents.
- To avoid even that metadata leak, in Syncthing settings disable
  **Global discovery** and **Relaying** — pairing then requires both
  devices to be on the same LAN.
- Nothing in this flow touches Mozgoslav's LLM endpoint. The phone talks
  only to other Syncthing peers.
