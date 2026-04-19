# Branch protection setup (manual, post-merge)

После первого мержа PR с `ci.yml` в `main` — зайти:
https://github.com/AlexShchuka/mozgoslav/settings/branches

**Add branch protection rule** → `main`:

- [x] Require a pull request before merging
- [ ] Require approvals (0 — solo repo)
- [x] Require status checks to pass before merging
  → Выбрать все jobs:
  - `Backend (.NET ubuntu-latest)`
  - `Backend (.NET macos-latest)`
  - `Frontend (ubuntu-latest)`
  - `Frontend (macos-latest)`
  - `Python sidecar (ubuntu-latest)`
  - `Python sidecar (macos-latest)`
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings (Include administrators)

After this, `main` is protected: no direct pushes, no force-pushes, every change goes through a PR with green CI.
