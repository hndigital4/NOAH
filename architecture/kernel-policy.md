# NOAH Kernel Policy

## Purpose

The NOAH Runtime Kernel is the stable foundation of the entire platform.

Its purpose is to provide infrastructure, not features.

---

## Rule 1

The Runtime must remain small.

---

## Rule 2

The Runtime must never depend on:

- Plugins
- Devices
- AI
- Cloud Services

---

## Rule 3

All communication happens through:

- Contracts
- Events

Never through direct subsystem coupling.

---

## Rule 4

Every new capability must answer:

Can this be implemented as

- Plugin
- Device
- Service

If yes:

It does not belong in the Runtime.

---

## Rule 5

Core Services are:

- EventBus
- Scheduler
- Logger
- Storage

These services may be used by other modules but must not depend on them.

---

## Rule 6

The Runtime owns:

- Boot
- Shutdown
- Lifecycle
- Service Registration

Nothing more.

---

## Rule 7

Plugins receive access only through PluginContext.

---

## Rule 8

Devices receive access only through DeviceContext.

---

## Rule 9

Every architectural change requires:

- ADR
- Tests
- Documentation Update

---

## Rule 10

The Runtime should still compile and run if every plugin is removed.
