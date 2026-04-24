<!--
PR title is the commit message (squash-merge only). Format:
  <type>(<scope>): <subject>
  types: feat fix docs style refactor perf test build ci chore
  breaking: feat(scope)!: ...
  header ≤ 100 chars
-->

## What

<!-- 1–3 bullets. What changed, observable outcome. -->

## Why

<!-- Linked Issue(s): closes #NNN, refs #NNN. Motivation only if the Issue doesn't cover it. -->

## Risk

<!-- What could break, blast radius, reversibility. "Low / isolated / fully reversible" is a valid answer. -->

## Test plan

<!-- Bulleted checklist. CI gates count; manual steps called out explicitly. -->

- [ ] `bash scripts/agent-gate.sh` green locally
- [ ] New / modified behaviour has matching test
- [ ] Manual:
