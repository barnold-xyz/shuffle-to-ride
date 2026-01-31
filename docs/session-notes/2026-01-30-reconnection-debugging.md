# Reconnection Feature Debugging Notes

## Current Status
The reconnection feature was implemented and deployed, but there's an issue.

## Problem
1. When a player closes the app or switches to airplane mode, the server does NOT detect them as disconnected
2. The player still shows as `connected: true` on the server
3. Client shows "Rejoin Room [CODE]" option (session was saved correctly)
4. When trying to rejoin, server returns "Player is already connected" error

## Root Cause
The server's `onClose` handler is NOT firing when clients disconnect abruptly. This is because:
- WebSocket/TCP connections don't immediately detect disconnects
- TCP keepalive timeout can take minutes
- Airplane mode doesn't send a close frame - the server just stops hearing from the client

## Potential Solutions
1. **Add heartbeat/ping mechanism** - Client sends periodic pings, server marks player disconnected if no ping received for X seconds
2. **Allow reconnection even if marked connected** - If same token, just update the connection ID (simplest fix)
3. **Use PartyKit's hibernation/alarm APIs** for connection health

## Recommended Fix
Option 2 is simplest - in `handleRejoinRoom`, instead of rejecting "already connected" players, just update their connection ID. The old connection is dead anyway.

```typescript
// Instead of:
if (player.connected) {
  this.sendError(conn, 'Player is already connected');
  return;
}

// Do:
// (remove the check entirely, or log a warning)
// The old connection is stale, just reassign to new connection
```

## Files to Modify
- `server/src/server.ts` - `handleRejoinRoom` (around line 166)
