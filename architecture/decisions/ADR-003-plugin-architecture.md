# ADR-003: Plugin Architecture

## Status

Accepted

## Context

NOAH must grow through new capabilities such as browser, mail, calendar, voice, home automation, and AI.

Adding these directly to the Runtime would make the core unstable.

## Decision

New capabilities are added through plugins.

The Runtime knows only plugin contracts, not concrete implementations.

## Consequences

- The Runtime remains small.
- Capabilities can be added without modifying the core.
- Plugins receive access only through PluginContext.
- Plugins must not instantiate core services directly.
