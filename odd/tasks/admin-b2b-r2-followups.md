# admin-b2b-r2-followups: bounded operational hardening

## Objective

Close bounded non-blocking follow-ups from the approved B2b R2 review without changing upload semantics:

1. verify and record that the R2 integration test already has an explicit proxy startup timeout;
2. document the safe bucket teardown order in the cloud provisioning runbook;
3. report an absent or malformed `MEDIA` binding once per Worker isolate without exposing environment values.

## Scope

- `docs/runbooks/cloud-provisioning.md`
- `odd/tasks/admin-b2b-r2.md`
- `workers/app.ts`
- `workers/handle-request.test.ts`
- this task document

Read-only evidence: `src/modules/media/infrastructure/r2-image-storage.r2.test.ts` already passes `60_000` as the explicit `beforeAll` timeout on `origin/main`; no source change is needed.

No production behavior, Cloudflare command, credential, bucket, migration, Worker binding, or workshop/B6 file is changed.

## TDD and checks

Strict TDD does not apply to the documentation/task-evidence correction because the alleged test-harness gap is already closed on `origin/main`. It does apply to the Worker observability behavior.

Focused checks:

- `corepack pnpm test workers/handle-request.test.ts` with observed RED and GREEN for the warning behavior;
- targeted Prettier check for changed files;
- `git diff --check origin/main`;
- readback confirming the timeout evidence, teardown sequence, and names-only once-per-isolate warning.

No full gate may run while B6 owns or is preparing to own `C:/Temp/calma-gate.lock`.

## Tasks

- [x] **T1 — Harden the bounded R2 operational follow-ups.** Record the pre-existing explicit proxy-startup timeout, clarify teardown order, run focused checks, independently verify the diff, and create one Conventional Commit.
- [x] **T2 — Report unavailable MEDIA binding once per isolate.** Prove missing, malformed, repeated, and valid binding behavior with strict TDD; keep public responses fail-soft; independently verify and create one Conventional Commit.

## Evidence

- Readback found `beforeAll(..., 60_000)` in `src/modules/media/infrastructure/r2-image-storage.r2.test.ts`; the review follow-up was stale and requires no code edit.
- Writer verification: targeted Prettier check passed after formatting; `git diff --check origin/main` passed.
- Independent verification: PASS for scope, teardown safety, exact checkbox closure, explicit timeout readback, targeted Prettier, and diff check.
- Work-unit commit: `20858780a637c473fb422c2ddf9e6292bf6a501a` (`docs(runbook): clarify R2 teardown order`).
- Full tests and full gate skipped for T1: documentation/task evidence only; no production or test code changed.
- T2 RED: `corepack pnpm test workers/handle-request.test.ts` failed 2 warning assertions because no warning was emitted.
- T2 GREEN: focused Worker test passed 40/40 after triangulating absent, malformed, repeated same-isolate, distinct-isolate, and valid binding cases.
- T2 independent verification: PASS; targeted Prettier and `git diff --check origin/main` passed.
- T2 work-unit commit: `c709e4b26d849f7d1597128da1dcada75d9201d2` (`fix(worker): report unavailable media binding once`).
- T2 native review: unavailable; START failed before lineage creation with `candidate-owner-preparation-failed` (`lineage_created: false`, no mutation). ASSESS treated the candidate as high/unassessable and required writer self-verification plus an independent verifier; both passed.
- T2 full gate deferred to avoid overlap with B6; focused behavior test, formatting, diff check, structural readback, and independent verification passed.
