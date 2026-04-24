# translation parity check

Automated verification that every `t(...)` key used in the codebase exists in both `ru.json` and `en.json`, and that neither file has orphan keys the code no longer references. Implemented either as a `jest` matcher over a generated key manifest, or a standalone script invoked in the frontend CI step. Fails the build on drift — no silent missing translations.
