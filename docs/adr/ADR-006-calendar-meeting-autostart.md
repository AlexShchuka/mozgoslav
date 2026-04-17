# ADR-006: Calendar meeting autostart + UX / LM Studio / V2 polish

- **Status:** Accepted
- **Date:** 2026-04-17 (extended from 2026-04-16 draft)
- **Related:** ADR-002 (Dictation), ADR-003 (Syncthing), ADR-004 (Dictation/Sync refinements), ADR-005 (Local RAG)

<!-- SECTION: Context -->
## Context

<!-- TODO: context paragraph -->

<!-- SECTION: Decisions -->
## Decisions

### D-calendar — Calendar & meeting-app autostart (original ADR-006 scope)

<!-- TODO: preserved original D1-D5 + Consequences + Alternatives + Implementation plan (future) -->

### D-1 — Button size ramp and macOS HIG 44pt hit target

<!-- TODO: decision + alternatives + consequences -->

### D-2 — Modular scale 1.25 for body/UI, golden 1.618 for hero

<!-- TODO: decision + alternatives + consequences -->

### D-3 — Press / release spring animations

<!-- TODO: decision + alternatives + consequences -->

### D-4 — Liquid Glass chrome (hand-rolled backdrop-filter)

<!-- TODO: decision + alternatives + consequences -->

### D-5 — Motion (ex-Framer Motion) with LazyMotion + domAnimation

<!-- TODO: decision + alternatives + consequences -->

### D-6 — Palette tokens (#F5F5F7 / #1C1C1E + 4 system accents)

<!-- TODO: decision + alternatives + consequences -->

### D-7 — Brain-icon launcher (Obsidian Second Brain vibe)

<!-- TODO: decision + alternatives + consequences -->

### D-8 — Record button enabled, wired to DictationSessionManager

<!-- TODO: decision + alternatives + consequences -->

### D-9 — Queue cancel endpoint + AnimatePresence row removal

<!-- TODO: decision + alternatives + consequences -->

### D-10 — i18n audit + ru/en parity enforcement

<!-- TODO: decision + alternatives + consequences -->

### D-11 — LM Studio discovery via /v1/models, no bundled downloader

<!-- TODO: decision + alternatives + consequences -->

### D-12 — README one-liners for dev + prod

<!-- TODO: decision + alternatives + consequences -->

### D-13 — Accessibility baseline (prefers-reduced-motion, WCAG AA, focus rings)

<!-- TODO: decision + alternatives + consequences -->

### D-14 — ILlmProvider abstraction (OpenAI-compat + Anthropic + Ollama)

<!-- TODO: decision + alternatives + consequences -->

### D-15 — V2 scaffolding: AVFoundation recorder, profile CRUD, kbar palette, onboarding wizard

<!-- TODO: decision + alternatives + consequences -->

<!-- SECTION: ImplementationPlan -->
## Implementation plan (this PR)

<!-- TODO: ordered list of B-sections as they land -->

<!-- SECTION: Migration -->
## Migration / breaking changes

None. Every change is additive — new settings default off or preserve prior behaviour, new tokens slot into the existing theme shape, new endpoints sit under new routes.

<!-- SECTION: Consequences -->
## Consequences

<!-- TODO: bundle size delta, maintenance, dependency matrix -->

<!-- SECTION: References -->
## References

- PR #2 — EnsureCreated RCA + dictation R1 + Syncthing skeleton — <https://github.com/AlexShchuka/mozgoslav/pull/2>
- ADR-005 — Local RAG Q&A (context for LM Studio embedding plans)
- [Motion (ex-Framer Motion)](https://motion.dev/)
- [Nielsen Norman Group — Golden ratio in UI design](https://www.nngroup.com/articles/golden-ratio-ui-design/)
- [Apple Human Interface Guidelines — Inputs](https://developer.apple.com/design/human-interface-guidelines/inputs)
