# app identity in Applications

The bundled DMG should register a proper display name and icon under `/Applications` on macOS. Covers: `CFBundleDisplayName`, `CFBundleIconFile` wired to `icon.icns`, LS registration, and correct dock/launchpad presentation after install — no generic "Electron" chrome, no placeholder icon.
