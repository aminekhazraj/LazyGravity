# PR: Fix `notify_user` content extraction + Add Telegram heartbeat timer

## Summary

Two fixes for the Telegram (and Discord) handler:

1. **`notify_user` content now extracted** — Removed `.notify-user-container` from DOM exclusion filters so `notify_user` messages are captured as response text
2. **Heartbeat timer for Telegram** — Added a 10-second interval that shows "⏳ Still working..." during silent phases (extended thinking, tool execution)

## Changes

### Fix 1: `notify_user` content extraction

**Files:** `src/services/responseMonitor.ts`, `src/services/assistantDomExtractor.ts`

Removed `.notify-user-container` from `isInsideExcludedContainer()` in 4 locations:
- `RESPONSE_TEXT` selector
- `DUMP_ALL_TEXTS` selector  
- `PROCESS_LOGS` selector
- Structured DOM extractor

The `PlanningDetector` independently handles Open/Proceed buttons in `.notify-user-container`, so removing the blanket exclusion is safe.

### Fix 2: Telegram heartbeat timer

**File:** `src/bot/telegramMessageHandler.ts`

Added:
- `lastProcessLogAt` tracking in `onProcessLog` callback
- 10-second `setInterval` heartbeat that updates status message with "⏳ Still working... Xs" when no process log has arrived for 10+ seconds
- Proper cleanup in `settle()` to clear the heartbeat timer

### Tests

**File:** `tests/services/responseMonitor.selectors.test.ts`

Updated 3 tests (19b, 19c, 19d) to assert `.notify-user-container` is **NOT** in the exclusion list (matching the fix).

## Testing

- ✅ `npm run build` passes
- ✅ All 1333 tests pass (0 failures)
- Manual: restart bot, run agentic task, verify `notify_user` content arrives in Telegram
