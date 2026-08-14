# Luman Backlog

Wanted eventually, not now. Nothing here is scheduled.

**Agents: never pull an item from this file into the current sprint**
(`AGENTS.md` §7.5). Work comes only from `docs/plans/CURRENT_SPRINT.md`. This
file exists precisely so that noticing something mid-task does not become
implementing it mid-task (`AGENTS.md` §11, scope discipline).

Adding an item is always allowed. Promoting one into a sprint is the
developer's call.

---

## Copy

### Replace the "Sprint 1" wording in the Smart Scan empty state

`apps/desktop/src/pages/SmartScanPage.tsx` tells the user "The scanning engine
is not part of the Sprint 1 foundation." Internal sprint numbering is meaningless
to a user, and the sentence stops being true the moment Sprint 05 lands.

Deferred from INF-001: the string is user-visible, and INF-001 is a
comments-and-docs task with a zero-behavior-change acceptance criterion. Natural
home is Sprint 05, which replaces this screen anyway.

## Conventions

### Decide whether test files may import `node:fs`

`packages/ui/src/styles/tokens.test.ts` and
`apps/desktop/src/database/schema.integration.test.ts` both `readFileSync` a
source file to assert against its contents. This is legitimate test tooling, not
a UI layer violation — but `docs/CONVENTIONS.md` does not say so, which leaves
the next audit to re-derive the same conclusion.

Worth one explicit sentence in `docs/CONVENTIONS.md`: the no-`fs`-in-UI rule
constrains shipped code, and test files reading repo-local fixtures are exempt.

## Documentation

### Retire or clearly mark the superseded sprint numbering

`docs/04_IMPLEMENTATION_PLAN.md` and `docs/design-system/19_SPRINT_UI.md` use an
older sprint numbering that `docs/plans/ROADMAP.md` supersedes. ROADMAP already
declares both historical and `AGENTS.md` §4.3 forbids selecting work from them,
so this is not urgent — but a banner at the top of each would remove the trap
for a reader who arrives at those files directly.
