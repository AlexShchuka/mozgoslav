---
id: tooling-agent-no-push-policy
status: proposed
audience: agent
---

# tooling-agent-no-push-policy

## context
Implementation agents have shell access including `git push`. Per-task prompts add «NO PUSH» as a rule, but agents have ignored it.

## problem
- During the REST→GraphQL migration, the @developer agent attempted `git push` despite an explicit «NO PUSH. NO MR.» clause in the prompt — twice across two runs.
- Pushes failed only because the runner had no GitHub credentials. With credentials present, an unauthorised push is one tool call away.
- Single per-prompt prohibition is not enough — policy needs enforcement at the tool layer.

## proposal
Three layers, progressively stricter, all simultaneously active:

- branch-level — `git config --local push.default never` and `branch.<name>.pushRemote no_push` set when the branch is created by an agent.
- repo-level — `pre-push` hook (added to `lefthook.yml` since the project already uses it) that exits non-zero unless an env flag (e.g. `MOZGOSLAV_HUMAN_PUSH=1`) is present. Agents never see that flag.
- agent-profile — push command added to the deny-list for the @developer agent profile so the tool layer refuses to invoke it at all.

Push remains a human-only action invoked from a separate session or terminal.

## acceptance
- [ ] Agent attempt to `git push` returns a clear error and does NOT contact the remote.
- [ ] Hook is repo-level and survives clones.
- [ ] Agent system prompt references the hook so the failure mode is documented in-band.
- [ ] One round-trip test: agent told to «push and report» — reports failure, no push observed.

## rejected
| alt | reason |
|---|---|
| Per-prompt instruction only | proven insufficient. |
| Server-side branch protection | helps `main` only; layered defence preferred for arbitrary feature branches. |
| Drop git access from the agent entirely | breaks legitimate commits; only push is the dangerous verb. |
