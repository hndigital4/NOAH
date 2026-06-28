# ADR-006: Runtime Boundaries

## Status

Accepted

## Context

As NOAH grows, there is a risk that new features are added directly to the Runtime Kernel.

This would increase coupling and reduce long-term maintainability.

## Decision

The Runtime Kernel owns only:

- Boot
- Shutdown
- Lifecycle
- Service Registry

All user-facing functionality must be implemented outside the Runtime through Services, Devices, Workflows or Plugins.

## Consequences

- Stable Runtime Kernel
- Easier testing
- Independent feature development
- Clear architectural boundaries
