# Agent task — unified lint + codestyle for Mozgoslav

**Audience:** an implementation agent (developer role). Not a human ADR. Execute top-to-bottom, commit per phase, do not skip.

**Authoritative.** If something contradicts this file, STOP and report.

---

## 0. Meta

**Owner:** shuka
**Target branch:** `shuka/lint-codestyle-2026-04-18` from `origin/main`.
**Commit mode:** commit per phase; phase numbers match commit subjects.
**No push. No MR.** Local only unless the user instructs otherwise.
**Quality bar:** best-practice only. If a phase can't meet the bar, stop and report.
**Scope discipline:** no "while I'm here". No refactors outside the listed files.
**2-strike rule:** same failure twice → stop, capture context, report. No silent third retry.
**Autonomy:** do not ask clarifying questions back. Pick the best default consistent with this brief; flag UNVERIFIED.
**Always read first.** Grep before creating; read existing config before editing.
**Commands:** every `dotnet` call MUST include `-maxcpucount:1` (sandbox CPU cap).

---

## 1. Goal

One command and one Rider hotkey that check + auto-fix **both** the .NET backend AND the Electron/React frontend, with a codestyle aligned to `/home/coder/workspace/scenarios` (C#) + `/home/coder/workspace/scenarios-frontend` (TS/React) plus the explicit rules the user pasted into the task (C# "Code style and best practices" document).

User-visible result:

- `./scripts/check.sh` — runs all linters + formatters with auto-fix. Exits 0 clean, non-zero on residual violations.
- `./scripts/check.sh --strict` — same tools in check-only mode (no writes). For CI.
- Rider: one hotkey (`Ctrl+Alt+Shift+L` by default) runs `check.sh` via an External Tool committed in `.idea/externalTools/`. First-time-setup-free for anyone who opens the repo in Rider.
- Every existing file is reformatted to the new style in ONE commit (Phase 7). Ongoing changes stay clean thanks to `lefthook` + CI.

**What we are NOT doing:** introducing a brand-new lint stack. We extend what is already there (EditorConfig + NET analyzers + ESLint + Prettier + lefthook) to match scenarios' rigor and encode the user-doc rules.

---

## 2. Tech decisions (fixed — do not relitigate)

| Concern | Decision | Rationale |
|---|---|---|
| C# style source | EditorConfig (existing), extended to match `scenarios/.editorconfig` (243 lines) + additions from user-doc | Single-file, Rider + `dotnet format` both consume it. Mirrors the codebase shuka edits day-to-day. |
| C# analyzer strictness | Inherit `scenarios/Directory.Build.props`: `AnalysisMode=AllEnabledByDefault`, `TreatWarningsAsErrors=true`, `EnforceCodeStyleInBuild=true` | Already in mozgoslav. Do NOT weaken; keep severity-overrides explicit per-rule in `.editorconfig`. |
| C# StyleCop / SonarAnalyzer | **NOT added.** scenarios doesn't use them; adding either introduces new noise | User asked "ближе к scenarios" — parity wins over theoretical coverage. Element-ordering / log-english / datetime-suffix become *documented* conventions (§ Phase 10). |
| Naming rules lintable | `_camelCase` prefix for private/internal fields (warning), PascalCase for constants (warning) | From scenarios; matches user-doc. |
| Exception handling lintable | Only what analyzers enforce (CA1031 kept off per scenarios, ValidationException convention documented) | Rest of the exception doc is convention-level — in CONTRIBUTING.md. |
| DateTime suffix | Documented convention only. No analyzer in scenarios; do not invent one | Analyzer would misfire on framework types. |
| Element ordering | Documented convention only (no StyleCop) | Parity with scenarios. |
| Frontend lint | ESLint (existing, flat config `eslint.config.js`) strengthened: strict TS rules, `import/order`, `no-explicit-any: error`, `@typescript-eslint/consistent-type-imports: error`, `@typescript-eslint/no-floating-promises: error` | Shared config from `scenarios-frontend` is a private Mindbox npm package — not accessible to the pet repo. We encode equivalent rules inline. |
| Frontend format | Prettier (existing `.prettierrc`): `printWidth` raised to `130` to match C# convention. `tabWidth: 2` spaces (NOT tabs) — frontend/JS ecosystem convention, keep parity with scenarios-frontend | The "tabs" rule in user-doc is explicitly C#-ecosystem; porting tabs to JS breaks every npm package we depend on. |
| Styled-components lint | Add `stylelint` + `stylelint-config-recommended` + `stylelint-processor-styled-components` for CSS-in-JS template literals | scenarios-frontend uses stylelint; we match. |
| Hook runner | Existing `lefthook.yml`. Extend with a `pre-push` check that runs `./scripts/check.sh --strict` | Catch residuals that slipped past `stage_fixed` on pre-commit. |
| Rider integration | `.idea/externalTools/MozgoslavLint.xml` (External Tool descriptor) + `.idea/keymaps/Mozgoslav.xml` (binds `Ctrl+Alt+Shift+L` to the tool) | Committed files = one hotkey for every clone. No manual Rider setup. |
| Bulk reformat | One commit at the end (Phase 7) applying the new style to the entire codebase | User-approved. No `.git-blame-ignore-revs` (not requested). |
| CI integration | Existing `.github/workflows/ci.yml` gets one step running `./scripts/check.sh --strict` after `checkout` | Fails PRs that introduce drift. |

Anything not in this table: simplest thing that works, flag UNVERIFIED.

---

## 3. Pre-flight

```bash
cd /home/coder/workspace/mozgoslav
git fetch origin main
git checkout main
git reset --hard origin/main
git status                    # MUST be clean
git checkout -b shuka/lint-codestyle-2026-04-18
```

Read (do not skip):

- `.editorconfig` — understand current shape.
- `backend/Directory.Build.props` — current analyzer config.
- `lefthook.yml` — current hook wiring.
- `frontend/eslint.config.js` + `frontend/.prettierrc` — current JS/TS tooling.
- `frontend/package.json` — existing npm scripts.
- `.github/workflows/ci.yml` — where the strict check will hook in.
- `/home/coder/workspace/scenarios/.editorconfig` — the parity target.
- `/home/coder/workspace/scenarios/Directory.Build.props` — compare.
- `/home/coder/workspace/scenarios-frontend/lefthook.yml` — pre-commit pattern reference.

If any material drift between the reads and this document's assumptions surfaces, STOP and report.

---

## 4. Phase 1 — EditorConfig parity + user-doc additions

Commit subject: `chore(style): editorconfig parity with scenarios + explicit coding-convention rules`

### 4.1 What to change in `.editorconfig`

Open `/home/coder/workspace/mozgoslav/.editorconfig`. It already has the `[*.cs]` basics. Merge in the missing blocks from `/home/coder/workspace/scenarios/.editorconfig` AND the explicit rules from the user-doc.

Full target shape — the file after this phase MUST contain at minimum (order preserved for reviewability; comments kept English):

**Top (before the `[*.cs]` block):**

```editorconfig
root = true

[*]
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
charset = utf-8

[*.{json,yml,yaml,md,css,scss,html}]
indent_style = space
indent_size = 2

[*.{ts,tsx,js,jsx,mjs,cjs}]
indent_style = space
indent_size = 2
max_line_length = 130
```

(Keep existing `[*.props]`, `[*.i18n.json]`, `[*.{csproj, config.development, config}]` blocks.)

**`[*.cs]` block additions.** Copy ALL of the following from `scenarios/.editorconfig` if missing in mozgoslav's:

- Severity overrides block — every `dotnet_diagnostic.*` and `dotnet_analyzer_diagnostic.*` line from scenarios lines 23-149. Match severities exactly (`none`, `suggestion`, `warning`) — do not downgrade.
- Naming rules block (scenarios lines 150-164):
  - `private_internal_fields` → `_camelCase` required, severity `warning`.
  - `constant_fields` → `PascalCase`, severity `warning`.
- Formatting / new-line options (scenarios 166-174): catch on new line, Allman braces, object-initializer members on separate lines.
- Using-directive sorting (scenarios 176-178): `dotnet_sort_system_directives_first = true`.
- Spacing options (scenarios 180-198): the full block — keep identical.
- Wrapping: `csharp_preserve_single_line_blocks = true` (scenarios 200-202).
- Modifier order (scenarios 204-206).
- ReSharper / Rider properties (scenarios 208-238) — the chunk starting `resharper_csharp_wrap_array_initializer_style = chop_if_long`. This is what lets Rider "Reformat Code" produce scenarios-style output.

**Additions from user-doc (scenarios doesn't enforce these; we add):**

```editorconfig
# User-doc: usings outside namespace, sorted, System.* first (already have sort).
csharp_using_directive_placement = outside_namespace:error

# User-doc: explicit visibility everywhere.
dotnet_style_require_accessibility_modifiers = always:error

# User-doc: prefer `var` / `new()` where apparent.
csharp_style_var_when_type_is_apparent = true:suggestion
csharp_style_var_for_built_in_types = true:suggestion
csharp_style_var_elsewhere = false:silent
csharp_style_implicit_object_creation_when_type_is_apparent = true:suggestion

# User-doc: prefer `!b` over `b == false`.
dotnet_style_prefer_not_pattern = true:warning

# User-doc: use `nameof(...)` over string literals.
dotnet_style_prefer_inferred_tuple_names = true:suggestion
dotnet_code_quality.ca1507.severity = warning
# CA1507 — Use nameof in place of string

# User-doc: C# 8 using statement without braces.
csharp_prefer_simple_using_statement = true:suggestion

# User-doc: language keywords over BCL types (int over Int32).
dotnet_style_predefined_type_for_locals_parameters_members = true:warning
dotnet_style_predefined_type_for_member_access = true:warning
```

**Test overrides** (scenarios lines 240-242): keep the mozgoslav pattern:

```editorconfig
[*Test{s.cs,.cs,sBase.cs,Base.cs}]
dotnet_diagnostic.VSTHRD200.severity = none
dotnet_diagnostic.CA1707.severity = none
```

### 4.2 Verify Phase 1

```bash
cd backend
dotnet format --verify-no-changes --verbosity minimal -maxcpucount:1
```

Expected: it reports drift (the old codebase doesn't conform yet). That's fine for Phase 1 — the bulk reformat is Phase 7. The critical assertion is that `dotnet format` PARSES the new config without errors. Grep stderr for "invalid" / "unknown" — if present, you mis-typed a rule; fix before commit.

**Phase 1 exit criteria:** `.editorconfig` is a line-by-line equal-or-superset of scenarios' `.cs` block (grep-assertable). `dotnet format --verify-no-changes` runs to completion (non-zero exit OK; tool-level errors not OK).

---

## 5. Phase 2 — `Directory.Build.props` — ensure strict mode

Commit subject: `chore(style): Directory.Build.props ensures strict analyzer mode`

Read `backend/Directory.Build.props`. It already contains most of what scenarios has. Confirm presence of:

- `<Nullable>enable</Nullable>`
- `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`
- `<EnableNETAnalyzers>true</EnableNETAnalyzers>`
- `<AnalysisMode>AllEnabledByDefault</AnalysisMode>`
- `<EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>`
- `<LangVersion>14</LangVersion>`

Add if missing (diff vs. scenarios):

- `<WarningsAsErrors>nullable</WarningsAsErrors>` — scenarios doesn't have it explicitly but `TreatWarningsAsErrors=true` + `AnalysisMode=AllEnabledByDefault` covers it. Skip unless the agent observes nullable warnings slipping through.
- Analyzer package refs — already has `IDisposableAnalyzers` + `Microsoft.VisualStudio.Threading.Analyzers`. Do not add more.

**NOT in scope:** adding StyleCop.Analyzers. User asked for parity with scenarios; scenarios doesn't use it.

**Phase 2 exit criteria:** `dotnet build -maxcpucount:1 backend/src/Mozgoslav.Api/Mozgoslav.Api.csproj` compiles; no new warnings introduced *by the Directory.Build.props change itself* (pre-existing style violations stay as warnings/errors — they'll be fixed in Phase 7).

---

## 6. Phase 3 — Frontend: ESLint strengthened + Prettier width 130 + stylelint for styled-components

Commit subject: `chore(style): frontend lint tightened; prettier width 130; stylelint for styled-components`

### 6.1 Packages to add (devDependencies)

```bash
cd frontend
npm install --save-dev \
  eslint-plugin-import \
  eslint-import-resolver-typescript \
  stylelint \
  stylelint-config-standard \
  stylelint-config-recommended \
  stylelint-processor-styled-components
```

Pin floating minors by letting npm pick latest; the `save-dev` writes the `^x.y.z` form. Commit the resulting `package-lock.json`.

### 6.2 ESLint config — extend `frontend/eslint.config.js`

Read the file (it's ~89 lines today). Do not rewrite from scratch; append the new rules into the existing rules object and plugins map. Target additions:

Plugins map:

```js
plugins: {
  "@typescript-eslint": tsPlugin,
  react: reactPlugin,
  "react-hooks": reactHooksPlugin,
  import: importPlugin,          // NEW
}
```

Settings — add `import/resolver`:

```js
settings: {
  react: { version: "detect" },
  "import/resolver": {
    typescript: { project: "./tsconfig.json" },
    node: { extensions: [".ts", ".tsx", ".js", ".jsx"] },
  },
}
```

Rules — strengthen existing, add new:

```js
rules: {
  ...tsPlugin.configs.recommended.rules,
  ...reactPlugin.configs.recommended.rules,
  ...reactHooksPlugin.configs.recommended.rules,

  "react/react-in-jsx-scope": "off",
  "react/prop-types": "off",

  // Tightened vs current setup:
  "@typescript-eslint/no-explicit-any": "error",                  // was "warn"
  "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
  "@typescript-eslint/no-floating-promises": "error",

  // New — import order (mirrors the C# "System.* first" spirit):
  "import/order": ["error", {
    groups: ["builtin", "external", "internal", ["parent", "sibling", "index"], "object", "type"],
    "newlines-between": "always",
    alphabetize: { order: "asc", caseInsensitive: true },
  }],
  "import/no-duplicates": "error",
  "import/newline-after-import": "error",

  // Legacy no-op rules stay off (TS handles them):
  "no-unused-vars": "off",
  "no-undef": "off",

  // Quality gates:
  "no-console": ["warn", { allow: ["warn", "error"] }],
  "eqeqeq": ["error", "always", { null: "ignore" }],
  "curly": ["error", "multi-line"],
}
```

The `@typescript-eslint/no-floating-promises` rule needs type information; ensure the parserOptions contains `project: "./tsconfig.json"`:

```js
parserOptions: {
  ecmaVersion: 2022,
  sourceType: "module",
  ecmaFeatures: { jsx: true },
  project: "./tsconfig.json",     // NEW — required for type-aware rules
  tsconfigRootDir: __dirname,     // NEW
}
```

If enabling the `project` flag breaks ESLint for files outside `tsconfig.json`'s include (e.g. `electron/**`), extend tsconfig's `include` to cover them OR add a scoped override block in `eslint.config.js` that disables type-aware rules for those files. Pick whichever is surgical; flag UNVERIFIED if both feel wrong.

### 6.3 Prettier — update `frontend/.prettierrc`

Current:

```json
{ "semi": true, "singleQuote": false, "printWidth": 100, "tabWidth": 2, "trailingComma": "es5", "arrowParens": "always", "bracketSpacing": true }
```

Change `printWidth` to `130`. Rest stays. `tabWidth: 2` stays — user-doc's "tabs" rule is explicitly C#-side; frontend stays on 2-space indent to match the JS ecosystem and scenarios-frontend shape.

Final:

```json
{
  "semi": true,
  "singleQuote": false,
  "printWidth": 130,
  "tabWidth": 2,
  "trailingComma": "all",
  "arrowParens": "always",
  "bracketSpacing": true,
  "endOfLine": "lf"
}
```

`trailingComma: all` instead of `es5` — matches modern TS ecosystem, scenarios-frontend shared-config also uses `all` (verified via rendered output in that repo, approximately).

### 6.4 Stylelint — add `frontend/.stylelintrc.json`

```json
{
  "processors": ["stylelint-processor-styled-components"],
  "extends": ["stylelint-config-standard", "stylelint-config-recommended"],
  "customSyntax": "postcss-styled-syntax",
  "rules": {
    "no-empty-source": null,
    "declaration-empty-line-before": null,
    "selector-type-no-unknown": null,
    "value-keyword-case": null,
    "function-no-unknown": null,
    "property-no-vendor-prefix": null
  }
}
```

If `stylelint-processor-styled-components` is deprecated in favour of `postcss-styled-syntax` at execution time, drop the `processors` key and keep `customSyntax`. The config must lint `.ts`/`.tsx` files containing `styled.div\`...\`` template literals.

### 6.5 Add npm scripts

Edit `frontend/package.json` scripts section. ADD (do not replace existing):

```json
"format": "prettier --write \"src/**/*.{ts,tsx,css,md,json}\" \"electron/**/*.ts\"",
"format:check": "prettier --check \"src/**/*.{ts,tsx,css,md,json}\" \"electron/**/*.ts\"",
"lint:fix": "eslint --fix \"src/**/*.{ts,tsx}\" \"electron/**/*.ts\"",
"stylelint": "stylelint \"src/**/*.{ts,tsx}\"",
"stylelint:fix": "stylelint --fix \"src/**/*.{ts,tsx}\"",
"check": "npm run typecheck && npm run lint && npm run format:check && npm run stylelint",
"check:fix": "npm run lint:fix && npm run format && npm run stylelint:fix"
```

Keep the existing `lint` script (`eslint "src/**/*.{ts,tsx}" "electron/**/*.ts"`) — `check` relies on it for non-fixing mode.

### 6.6 Verify Phase 3

```bash
cd frontend
npm run check           # may fail — pre-reformat state; the config must at least LOAD without errors
npm run typecheck
```

Assert: config files parse, scripts are wired. Violations are expected; fixing them is Phase 7.

**Phase 3 exit criteria:** ESLint + Prettier + Stylelint load without "plugin not found" or "invalid rule" errors. `npm run check:fix` runs to completion.

---

## 7. Phase 4 — Root `scripts/check.sh`

Commit subject: `chore(style): unified lint+format runner (backend + frontend)`

Create `/home/coder/workspace/mozgoslav/scripts/check.sh` (make executable with `chmod +x`):

```bash
#!/usr/bin/env bash
# Usage:
#   ./scripts/check.sh          → auto-fix mode (dotnet format, eslint --fix, prettier --write, stylelint --fix)
#   ./scripts/check.sh --strict → check-only (used by CI and by lefthook pre-push)
#
# Exits 0 when the codebase is clean AFTER any auto-fixing (or in strict mode when no drift exists).
# Exits non-zero when residual violations remain.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="fix"
if [[ "${1-}" == "--strict" ]]; then
  MODE="strict"
fi

log() { printf '\n\033[1;36m[check]\033[0m %s\n' "$1"; }
fail() { printf '\n\033[1;31m[check]\033[0m %s\n' "$1" >&2; exit 1; }

# -------- Backend --------
log "Backend: dotnet format ($MODE)"
if [[ "$MODE" == "fix" ]]; then
  (cd backend && dotnet format --verbosity minimal -maxcpucount:1) || fail "dotnet format failed"
else
  (cd backend && dotnet format --verify-no-changes --verbosity minimal -maxcpucount:1) || fail "dotnet format found violations (run without --strict to auto-fix)"
fi

# -------- Frontend --------
log "Frontend: typecheck"
(cd frontend && npm run typecheck) || fail "typecheck failed"

log "Frontend: eslint ($MODE)"
if [[ "$MODE" == "fix" ]]; then
  (cd frontend && npm run lint:fix)
else
  (cd frontend && npm run lint)
fi || fail "eslint reported violations"

log "Frontend: prettier ($MODE)"
if [[ "$MODE" == "fix" ]]; then
  (cd frontend && npm run format)
else
  (cd frontend && npm run format:check) || fail "prettier found drift (run without --strict to auto-fix)"
fi

log "Frontend: stylelint ($MODE)"
if [[ "$MODE" == "fix" ]]; then
  (cd frontend && npm run stylelint:fix) || fail "stylelint failed"
else
  (cd frontend && npm run stylelint) || fail "stylelint reported violations"
fi

log "All checks passed."
```

**Verify Phase 4:**

```bash
chmod +x scripts/check.sh
./scripts/check.sh --strict   # expected to fail pre-reformat — that's Phase 7's job
```

**Phase 4 exit criteria:** script runs end-to-end without tool-level errors (config parse / missing binary). Non-zero exit due to residual style drift is acceptable at this point.

---

## 8. Phase 5 — Rider External Tool + keymap

Commit subject: `chore(rider): shared External Tool "Lint & Format" bound to Ctrl+Alt+Shift+L`

### 8.1 Create `.idea/externalTools/MozgoslavLint.xml`

```xml
<toolSet name="Mozgoslav">
  <tool name="Lint &amp; Format" description="Runs scripts/check.sh — backend (dotnet format) + frontend (eslint/prettier/stylelint) with auto-fix."
        showInMainMenu="true" showInEditor="false" showInProject="true" showInSearchPopup="true"
        disabled="false" useConsole="true" showConsoleOnStdOut="true" showConsoleOnStdErr="true"
        synchronizeAfterRun="true">
    <exec>
      <option name="COMMAND" value="bash" />
      <option name="PARAMETERS" value="$ProjectFileDir$/scripts/check.sh" />
      <option name="WORKING_DIRECTORY" value="$ProjectFileDir$" />
    </exec>
  </tool>
  <tool name="Lint &amp; Format (strict)" description="Check-only mode. Use before committing."
        showInMainMenu="true" showInEditor="false" showInProject="true" showInSearchPopup="true"
        disabled="false" useConsole="true" showConsoleOnStdOut="true" showConsoleOnStdErr="true"
        synchronizeAfterRun="true">
    <exec>
      <option name="COMMAND" value="bash" />
      <option name="PARAMETERS" value="$ProjectFileDir$/scripts/check.sh --strict" />
      <option name="WORKING_DIRECTORY" value="$ProjectFileDir$" />
    </exec>
  </tool>
</toolSet>
```

### 8.2 Create `.idea/keymaps/Mozgoslav.xml`

```xml
<keymap version="1" name="Mozgoslav" parent="Default">
  <action id="Tool_Mozgoslav_Lint &amp; Format">
    <keyboard-shortcut first-keystroke="ctrl alt shift L" />
  </action>
</keymap>
```

### 8.3 Nudge the default keymap

Create `.idea/workspace.xml` additions carefully — `.idea/workspace.xml` is typically `.gitignored` and SHOULD NOT be committed. We rely on the user selecting the "Mozgoslav" keymap once in `Settings → Keymap → dropdown`. Document this in CONTRIBUTING.md (Phase 10):

> First-time Rider setup: **Settings → Keymap → Mozgoslav** (next to Default / Eclipse / Visual Studio presets). Our External Tool binding will then be active. `Ctrl+Alt+Shift+L` runs `scripts/check.sh` with auto-fix; `Ctrl+Alt+Shift+S` runs strict (add manually if desired).

Auto-selecting the keymap on repo open is not a first-class Rider feature; hand-waving around it with workspace.xml has historically been brittle. Do not try.

### 8.4 `.gitignore` audit

Read `.gitignore`. If it ignores `.idea/` entirely, add EXPLICIT include lines:

```gitignore
# Commit the shared IDE hints (External Tools + keymap) even when .idea is ignored.
!.idea/
.idea/*
!.idea/externalTools/
!.idea/externalTools/**
!.idea/keymaps/
!.idea/keymaps/**
```

If it already ignores selective parts of `.idea`, amend surgically. If there's no `.idea` rule at all — leave `.gitignore` alone; nothing to ignore.

**Phase 5 exit criteria:** `.idea/externalTools/MozgoslavLint.xml` + `.idea/keymaps/Mozgoslav.xml` present and committed; opening Rider picks them up (cannot verify in the Linux pod — flag UNVERIFIED, note for macOS validation).

---

## 9. Phase 6 — `lefthook.yml` strict pre-push

Commit subject: `chore(style): lefthook pre-push runs strict check`

Read current `lefthook.yml`. Pre-commit already runs `dotnet format --include` + `eslint --fix` + `prettier --write` on staged files. Add a `pre-push` hook:

```yaml
pre-push:
  commands:
    full-check:
      run: ./scripts/check.sh --strict
```

Also TIGHTEN pre-commit — the existing `dotnet-format` glob `"*.cs"` triggers even for unrelated files; keep as is, it already works. Do NOT remove the python ruff entry (out of scope here).

ADD to pre-commit:

```yaml
    stylelint:
      glob: "frontend/src/**/*.{ts,tsx}"
      root: frontend
      run: npx stylelint --fix {staged_files}
      stage_fixed: true
```

**Phase 6 exit criteria:** `lefthook run pre-commit` and `lefthook run pre-push` both execute without tool errors. Residual style drift (pre-bulk-reformat) can still fail them — acceptable until Phase 7 completes.

---

## 10. Phase 7 — Bulk reformat

Commit subject: `style: bulk reformat — conform entire codebase to new codestyle`

This is the big one. Sequence matters: fix C# first (analyzer-driven), then JS/TS (prettier/eslint don't interfere cross-project).

```bash
# 1. Backend — apply the new editorconfig rules across the whole solution.
(cd backend && dotnet format --verbosity normal -maxcpucount:1)

# 2. Frontend — eslint --fix first (since prettier might then widen/narrow lines).
(cd frontend && npm run lint:fix)
(cd frontend && npm run format)
(cd frontend && npm run stylelint:fix)

# 3. Verify.
(cd backend && dotnet test -maxcpucount:1)                    # all existing tests still pass
(cd frontend && npm test && npm run typecheck)                # same

# 4. Final strict pass — MUST come back clean.
./scripts/check.sh --strict
```

If `./scripts/check.sh --strict` is not clean at step 4, it means a rule is triggering violations that auto-fix doesn't resolve (e.g. a `dotnet format` rule that's severity warning but not auto-fixable; or an eslint rule that only flags without fixing). DO NOT lower the severity to hide it. Instead:

- If the rule is genuinely impossible to auto-fix at scale (e.g. `IDE0058 Remove unnecessary expression value` across thousands of LINQ `.ToList()` calls) — downgrade the severity to `suggestion` in `.editorconfig`, add a comment `# Bulk-reformat exception: <reason>`, re-run, commit. Flag UNVERIFIED in the report.
- If it's a real violation that needs code surgery — fix by hand across files. This is the only acceptable kind of scope expansion in this phase, because it's inherent to "bulk reformat".

Commit ONCE. Single huge diff. Do not split into sub-commits — the intent is a single "style only" commit that reviewers can collapse in blame.

**Phase 7 exit criteria:**

- `./scripts/check.sh --strict` exits 0.
- `dotnet test -maxcpucount:1` (backend) all green.
- `npm test && npm run typecheck` (frontend) all green.
- `git diff --stat HEAD~1 HEAD` shows ONLY whitespace/ordering/rename-style changes. No behavioural changes. No file deletions. No new dependencies introduced in this commit (that was Phase 3).

---

## 11. Phase 8 — CI integration

Commit subject: `ci(style): gating on scripts/check.sh --strict`

Read `.github/workflows/ci.yml`. Understand the existing jobs. Add a new job (or a step in an existing job) that runs the strict check:

```yaml
  codestyle:
    name: Codestyle (dotnet format + eslint + prettier + stylelint)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - name: Install frontend deps
        run: cd frontend && npm ci
      - name: Run strict check
        run: ./scripts/check.sh --strict
```

If the existing `ci.yml` already has `setup-dotnet` + `setup-node` steps in a "build" job, prefer adding one `Run strict check` step to that job (less CI minutes) instead of a parallel job. Decision — one job with a style step is acceptable; make sure the step runs BEFORE `dotnet build` so style failures block the pipeline cheaply.

**Phase 8 exit criteria:** CI YAML validates (`gh workflow view` or a local linter). Do NOT run the workflow — no push until user asks.

---

## 12. Phase 9 — CONTRIBUTING.md conventions (non-lintable rules)

Commit subject: `docs(style): document non-lintable conventions (datetime suffix, element order, exception handling, log language)`

Read `CONTRIBUTING.md` (it exists, 5.4K). Append a new section `## Codestyle conventions (not enforced by analyzers)`:

Include verbatim the user-doc's non-lintable rules, translated where necessary to a concise imperative English tone (matching the rest of CONTRIBUTING.md). Required coverage:

### Naming

- `Async` suffix on every `async Task`-returning method. Exception: the MSTest/NUnit test methods (VSTHRD200 is off for tests).
- `Utc` suffix on UTC `DateTime` (`PaymentAtUtc`). `Local` for local time. `Date` for date-only. `Time` for time-only.
- Interface names start with `I`. Attribute types end in `Attribute`.
- Enum types: singular for value-style (`Status`), plural only for `[Flags]`.
- No Hungarian notation. No abbreviations outside domain-accepted ones.

### Element ordering (per type)

1. Constants
2. `readonly` fields
3. Fields
4. Properties
5. Constructors
6. Methods

Within each kind, order by visibility:
- Fields / properties / constants: `private → internal → protected → public`.
- Methods: `public → internal → protected → private`.

No interleaving. If `#region` helps a large file, group a property + its method pair inside a region — acceptable.

### Logging

All technical log messages in English. No Russian in `Log.Information(...)` or structured log templates.

### Exception handling

- Fail fast close to the point of failure.
- Exception `Message` is a CONSTANT string in English (Sentry-friendly aggregation). Per-incident data goes into `exception.Data["key"] = value`.
- Every caught exception hits a log — except `ValidationException`, which flows to the user as-is.
- Programmer errors: throw `ArgumentException` / `InvalidOperationException`. User input errors: `ValidationException`. `NotImplementedException` only when code is genuinely planned; `NotSupportedException` otherwise.
- Rethrow via `throw;` to preserve the stack. If wrapping, set `innerException`.
- Never silent-catch.

### Misc

- Delete dead / commented-out code. If truly temporary, leave a `// TODO: reason` with a rationale.
- Declare variables immediately before first use and initialise at the declaration site when possible.
- `TreatWarningsAsErrors` stays `true` on every project.

Add a terminal note:

> The majority of these rules are enforced by `.editorconfig` + NET analyzers + ESLint. The non-lintable items above are ENFORCED BY REVIEW. Reviewers decline a PR that violates them; authors do not debate.

**Phase 9 exit criteria:** `CONTRIBUTING.md` contains the section; grep for each bullet to confirm.

---

## 13. Verification checklist (enforced at each phase boundary)

Before every commit:

- [ ] `dotnet build -maxcpucount:1` passes with zero new warnings on the changed files.
- [ ] `dotnet test -maxcpucount:1` — all tests green.
- [ ] `npm run typecheck` green.
- [ ] `npm run lint` green.
- [ ] `npm test` green.
- [ ] `./scripts/check.sh --strict` — green after Phase 7; permitted to fail before.
- [ ] `lefthook run pre-commit` + `lefthook run pre-push` both complete.
- [ ] Only files listed in the phase description were touched — check `git diff --name-only`.
- [ ] No push, no MR, no main/master touched.

If ANY box is unchecked: phase is not done. Do not commit.

---

## 14. Report

Append to `/home/coder/workspace/mozgoslav-lint-report-<short-id>.md` after each phase commit:

- Phase number + SHA.
- Files added / modified.
- What `./scripts/check.sh --strict` reported (pass/fail + counts).
- Any UNVERIFIED items with rationale (Rider keymap auto-selection, workspace.xml strategy, stylelint processor stability, and anything else the agent pulled a default on).

End with a top-level summary:
- Total commits.
- Total style errors auto-fixed in Phase 7 (backend / frontend).
- The one hotkey the user presses.
- Path to the report.

---

## 15. Commit schema

```
chore(style): phase 1 — editorconfig parity with scenarios + explicit coding-convention rules
chore(style): phase 2 — Directory.Build.props ensures strict analyzer mode
chore(style): phase 3 — frontend lint tightened; prettier width 130; stylelint for styled-components
chore(style): phase 4 — unified lint+format runner (backend + frontend)
chore(rider): phase 5 — shared External Tool "Lint & Format" bound to Ctrl+Alt+Shift+L
chore(style): phase 6 — lefthook pre-push runs strict check
style: phase 7 — bulk reformat — conform entire codebase to new codestyle
ci(style): phase 8 — gating on scripts/check.sh --strict
docs(style): phase 9 — document non-lintable conventions
```

Each commit body: files modified + test counts + strict-check status. No emoji. No Co-Authored-By unless user asks.

---

## 16. What you MUST NOT do

- NEVER push to remote. No `git push`.
- NEVER open a PR. No `gh pr create`.
- NEVER touch `main` or `master`.
- NEVER use `--force`, `--no-verify`, `-c commit.gpgsign=false`.
- NEVER collapse phases into one commit. One phase = one commit. Phase 7 is ONE commit (bulk reformat is the whole point).
- NEVER install StyleCop.Analyzers or SonarAnalyzer.CSharp — parity with scenarios wins.
- NEVER weaken the severity of a rule that already exists as a warning/error unless Phase 7 hits a genuinely un-auto-fixable wall (§ Phase 7 notes).
- NEVER change backend business logic in Phase 7. Whitespace + renames only. If an IDE rule rewrites logic (e.g. `IDE0290` primary constructors — already off), check the diff and revert the behaviour change.
- NEVER commit a secret, token, or private npm registry reference. scenarios-frontend uses `@mindbox-moscow/*` private packages — do NOT add them to mozgoslav. Encode the rules inline in the local ESLint config.
- NEVER force tabs on frontend. JS/TS stays 2-space.
- NEVER introduce a Rider workspace.xml commit — it's user-local, auto-selecting a keymap there is brittle. Document the one-time manual step in CONTRIBUTING.md instead.
- NEVER expand scope ("while I'm here…"). If an unrelated bug surfaces — flag in the report, do not fix.
- NEVER touch `.archive/`, `docs/adr/`, the `docs/agent-tasks/graphql-migration.md` file, or the roadmap.

---

## 17. Tools & skills

Full sandbox access. Recommended pattern per phase:

1. READ the existing config + any scenarios reference file.
2. SEARCH (`grep`) for duplicates before creating new keys/rules.
3. Make the edit.
4. Run the verification for that phase.
5. Commit.

Phase 7 is the only "big batch" — there you write nothing manually; you orchestrate `dotnet format` + `eslint --fix` + `prettier --write` + `stylelint --fix` + verification + one commit.

If this document conflicts with `backend/CLAUDE.md` / `frontend/CLAUDE.md` / root `CLAUDE.md`: THIS document wins inside the lint-codestyle migration. Outside it, they stay authoritative.

Ship it clean.
