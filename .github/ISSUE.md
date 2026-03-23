# Issue: `notify_user` content not delivered to Telegram/Discord + Timer freezes during long silent phases

## Problem

### 1. `notify_user` response not sent to Telegram
When Antigravity calls `notify_user` at the end of an agentic task (e.g. marketing workflows), the response monitor captures "Notifying user of all results" in the console log but the **actual content is never delivered** to Telegram.

**Root cause:** `.notify-user-container` is in the `isInsideExcludedContainer()` filter across `responseMonitor.ts` (3 places) and `assistantDomExtractor.ts` (1 place). The `notify_user` message content renders inside this container, so it's always filtered out, resulting in empty/missing response text.

### 2. Status message timer freezes during long silent phases
The Telegram status message shows elapsed time but **stops updating** during extended thinking or tool-waiting phases (observed freezing at ~355s). The timer only updates when `onProcessLog` fires, and during silent phases there are no process log events.

**Root cause:** Unlike the Discord handler which has an independent 1-second `setInterval` timer, the Telegram handler had no heartbeat mechanism.

## Expected Behavior
1. `notify_user` content should be extracted and sent back as the final response
2. Status message should keep ticking during silent phases, indicating the bot is still alive

## Reproduction
1. Send a long agentic task via Telegram (e.g., `/marketing` workflow)
2. Observe that final results say "Notifying user of all results" but no content follows
3. During execution, observe the timer freezing during extended thinking phases
