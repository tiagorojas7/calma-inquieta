# admin-b2b-r2-followups: bounded operational hardening

## Objective

Close the two safest non-blocking follow-ups from the approved B2b R2 review without changing production upload behavior:

1. verify and record that the R2 integration test already has an explicit proxy startup timeout;
2. document the safe bucket teardown order in the cloud provisioning runbook.

## Scope

- `docs/runbooks/cloud-provisioning.md`
- `odd/tasks/admin-b2b-r2.md`
- this task document

Read-only evidence: `src/modules/media/infrastructure/r2-image-storage.r2.test.ts` already passes `60_000` as the explicit `beforeAll` timeout on `origin/main`; no source change is needed.

No production behavior, Cloudflare command, credential, bucket, migration, Worker binding, or workshop/B6 file is changed.

## TDD and checks

Strict TDD does not apply because the only required edit is documentation/task evidence; the alleged test-harness gap is already closed on `origin/main`.

Focused checks:

- targeted Prettier check for the changed Markdown files;
- `git diff --check origin/main`;
- readback confirming the timeout evidence and teardown sequence.

No full gate may run while B6 owns or is preparing to own `C:/Temp/calma-gate.lock`.

## Tasks

- [ ] **T1 — Harden the bounded R2 operational follow-ups.** Record the pre-existing explicit proxy-startup timeout, clarify teardown order, run focused checks, independently verify the diff, and create one Conventional Commit.

## Evidence

- Readback found `beforeAll(..., 60_000)` in `src/modules/media/infrastructure/r2-image-storage.r2.test.ts`; the review follow-up was stale and requires no code edit.
- Remaining evidence pending.
