# Sprint 01 — Repository & Foundation

**Status:** Complete  
**Duration:** 2 weeks  
**Governed by:** Engineering Blueprint Part 03 — Sprint Plan

---

## Deliverables

| Package | Files | Status |
|---|---|---|
| Root monorepo | package.json, turbo.json, pnpm-workspace.yaml | ✓ |
| TypeScript config | tsconfig.base.json | ✓ |
| ESLint | .eslintrc.cjs (with forbidden dep rules) | ✓ |
| Prettier | .prettierrc | ✓ |
| Vitest | vitest.config.ts | ✓ |
| VSCode | .vscode/settings.json | ✓ |
| CI | .github/workflows/ci.yml, nightly.yml | ✓ |
| services/eventbus | Priority queue, router, EventBus, types, tests | ✓ |
| services/logger | Logger, AuditChain, structured types, tests | ✓ |
| services/scheduler | Scheduler, 100ms heartbeat, deferred tasks, tests | ✓ |
| services/storage | AES-256-GCM encryption, MemoryAdapter, types, tests | ✓ |

## Definition of Done — Verification

Run: `./scripts/verify-sprint-01.sh`

### Key constraints verified

- **eventbus** has zero `@noah/*` dependencies — enforced by package.json and ESLint
- **Event Bus** P0 events dispatch synchronously (no timer latency)
- **AuditChain** produces hash-chained entries — tampering is detectable
- **AES-256-GCM** applied to all storage values — partition keys are independent
- All test files present and exercising the behavioral contracts

## Next: Sprint 02 — Security Engine

The Security Engine depends on all four Sprint 01 services being operational.
It will implement:
- Permission gate (PermissionRequest / PermissionDecision)
- Session token lifecycle
- Key hierarchy via HKDF-SHA512
- Full Emergency Lock with Working Memory zeroing
- Device trust certificate (stub — full PKI in Sprint 10)
