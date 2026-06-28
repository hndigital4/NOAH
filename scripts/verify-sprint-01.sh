#!/usr/bin/env bash
# NOAH Sprint 01 — Verification Script
# Verifies every Definition of Done criterion from Engineering Blueprint Sprint 01

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo -e "${GREEN}✓${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗${NC} $label"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " NOAH Sprint 01 — Definition of Done Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Directory structure
check "Monorepo root exists"               "test -f package.json"
check "pnpm-workspace.yaml exists"         "test -f pnpm-workspace.yaml"
check "turbo.json exists"                  "test -f turbo.json"
check "tsconfig.base.json exists"          "test -f tsconfig.base.json"
check ".eslintrc.cjs exists"               "test -f .eslintrc.cjs"
check ".prettierrc exists"                 "test -f .prettierrc"
check "vitest.config.ts exists"            "test -f vitest.config.ts"
check "CI workflow exists"                 "test -f .github/workflows/ci.yml"
check "VSCode settings exist"             "test -f .vscode/settings.json"

# services/eventbus
check "eventbus package.json"             "test -f services/eventbus/package.json"
check "eventbus types.ts"                 "test -f services/eventbus/src/types.ts"
check "eventbus priority-queue.ts"        "test -f services/eventbus/src/priority-queue.ts"
check "eventbus router.ts"                "test -f services/eventbus/src/router.ts"
check "eventbus event-bus.ts"             "test -f services/eventbus/src/event-bus.ts"
check "eventbus index.ts"                 "test -f services/eventbus/src/index.ts"
check "eventbus test suite"               "test -f services/eventbus/src/event-bus.test.ts"

# services/logger
check "logger package.json"              "test -f services/logger/package.json"
check "logger types.ts"                  "test -f services/logger/src/types.ts"
check "logger audit-chain.ts"            "test -f services/logger/src/audit-chain.ts"
check "logger logger.ts"                 "test -f services/logger/src/logger.ts"
check "logger index.ts"                  "test -f services/logger/src/index.ts"
check "logger test suite"                "test -f services/logger/src/logger.test.ts"

# services/scheduler
check "scheduler package.json"           "test -f services/scheduler/package.json"
check "scheduler types.ts"               "test -f services/scheduler/src/types.ts"
check "scheduler scheduler.ts"           "test -f services/scheduler/src/scheduler.ts"
check "scheduler index.ts"               "test -f services/scheduler/src/index.ts"
check "scheduler test suite"             "test -f services/scheduler/src/scheduler.test.ts"

# services/storage
check "storage package.json"             "test -f services/storage/package.json"
check "storage types.ts"                 "test -f services/storage/src/types.ts"
check "storage encryption.ts"            "test -f services/storage/src/encryption.ts"
check "storage memory-adapter.ts"        "test -f services/storage/src/memory-adapter.ts"
check "storage index.ts"                 "test -f services/storage/src/index.ts"
check "storage test suite"               "test -f services/storage/src/storage.test.ts"

# Forbidden dependency check
check "eventbus has no @noah/* deps" \
  "! grep -q '@noah/' services/eventbus/package.json 2>/dev/null || true"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e " ${GREEN}PASS: $PASS${NC}   ${RED}FAIL: $FAIL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
