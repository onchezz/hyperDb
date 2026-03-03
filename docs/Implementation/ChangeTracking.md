---
title: Change Tracking
---

# Change Tracking

HyperTillDB keeps an internal maintainer log at:

- `/HYPERTILLDB_CHANGE_TRACKER.md`

Use it to track:

1. architectural changes
2. removed legacy files
3. package entrypoint and publish changes
4. test and verification outcomes
5. open risks and follow-up tasks

## Required update points

Update the tracker whenever you change:

1. `src/index.*`, `src/hypertill.*`, or `src/{modeling,typeFirst,runtime,generator}/*` API exports
2. adapter resolution behavior
3. migration/sync contracts
4. docs structure or routing
5. publish scripts or package metadata

## Entry template

1. Date (UTC)
2. Scope
3. Files touched
4. Behavior impact
5. Validation commands + results
6. Follow-up
