# ADR-005: AI is Optional

## Status

Accepted

## Context

NOAH is not a chatbot and not an AI wrapper.

AI may be useful later, but the Runtime must remain deterministic and independent.

## Decision

AI is always optional.

AI providers are plugins and must never be required by the Runtime.

## Consequences

- NOAH works without AI.
- No API token is required for the core.
- Local AI providers can be supported later.
- Cloud AI providers are optional plugins.
