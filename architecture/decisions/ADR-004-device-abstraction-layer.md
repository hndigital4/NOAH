# ADR-004: Device Abstraction Layer

## Status

Accepted

## Context

NOAH must interact with desktop, files, browser, audio, and other operating system resources.

Direct platform-specific access would couple the system to macOS, Windows, or Linux.

## Decision

NOAH uses a Device Layer to abstract operating system capabilities.

## Consequences

- Workflows do not talk directly to OS APIs.
- Plugins use device contracts.
- Platform-specific implementations remain isolated.
- The Runtime stays platform-independent.
