# Turn Action Exclusivity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce that players must choose to either draw cards OR claim a route on their turn, not both.

**Architecture:** Add `routesClaimed` tracking to turn state, validate discard attempts against cards drawn, auto-end turn after route claim.

**Tech Stack:** TypeScript, PartyKit

---

### Task 1: Extend CurrentTurn Interface

**Files:**
- Modify: `server/src/types.ts:26-30`

**Step 1: Add routesClaimed field to CurrentTurn**

```typescript
export interface CurrentTurn {
  playerId: string;
  cardsDrawn: number;
  drewLocomotive: boolean;
  routesClaimed: number;  // 0 or 1
}
```

**Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add server/src/types.ts
git commit -m "feat: add routesClaimed to CurrentTurn interface"
```

---

### Task 2: Initialize routesClaimed in startTurn

**Files:**
- Modify: `server/src/gameLogic.ts:259-263` (startTurn function)

**Step 1: Find the startTurn function and add routesClaimed initialization**

Current code:
```typescript
state.currentTurn = {
  playerId,
  cardsDrawn: 0,
  drewLocomotive: false,
};
```

New code:
```typescript
state.currentTurn = {
  playerId,
  cardsDrawn: 0,
  drewLocomotive: false,
  routesClaimed: 0,
};
```

**Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add server/src/gameLogic.ts
git commit -m "feat: initialize routesClaimed to 0 in startTurn"
```

---

### Task 3: Add Validation in handleDiscardCards

**Files:**
- Modify: `server/src/server.ts` (handleDiscardCards method)

**Step 1: Add validation at start of handleDiscardCards**

Find the `handleDiscardCards` method. After the `if (this.state.phase !== 'playing') return;` check, add:

```typescript
// Validate turn action exclusivity - cannot claim route after drawing cards
if (this.state.currentTurn?.cardsDrawn && this.state.currentTurn.cardsDrawn > 0) {
  this.sendError(conn, 'You cannot claim a route after drawing cards');
  return;
}
```

**Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add server/src/server.ts
git commit -m "feat: validate cannot claim route after drawing cards"
```

---

### Task 4: Track Route Claim and Auto-End Turn

**Files:**
- Modify: `server/src/server.ts` (handleDiscardCards method)

**Step 1: After successful discard, track claim and auto-end turn**

Find the section after `this.broadcastPlayerAction(...)` in handleDiscardCards. Add route claim tracking and auto-end turn logic:

```typescript
// Track route claim
if (this.state.currentTurn) {
  this.state.currentTurn.routesClaimed = 1;
}

// Auto-end turn after claiming a route
const nextPlayerId = getNextPlayer(this.state);
if (nextPlayerId) {
  const nextPlayer = this.state.players.find((p) => p.id === nextPlayerId);
  startTurn(this.state, nextPlayerId);
  if (nextPlayer) {
    this.broadcastPlayerAction(nextPlayerId, {
      type: 'turn-started',
      playerName: nextPlayer.name,
    });
  }
}
```

**Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add server/src/server.ts
git commit -m "feat: auto-end turn after claiming a route"
```

---

### Task 5: Manual Testing

**Step 1: Start local server (via WSL)**

```bash
cd /mnt/c/shuffle-to-ride/.worktrees/turn-action-exclusivity/server && npm run dev
```

**Step 2: Update client to use local server**

In `app/src/config.ts`, set `USE_LOCAL_SERVER = true` and update IP if needed.

**Step 3: Test scenarios**

1. Draw a card, then try to discard → Should see error "You cannot claim a route after drawing cards"
2. Discard cards to claim route → Turn should end immediately and pass to next player
3. Draw 2 cards → Turn ends normally (existing behavior)
4. Draw face-up locomotive → Turn ends immediately (existing behavior)

**Step 4: Reset config**

Set `USE_LOCAL_SERVER = false` in `app/src/config.ts`.

---

### Task 6: Deploy and Merge

**Step 1: Deploy server from worktree (via WSL)**

```bash
cd /mnt/c/shuffle-to-ride/.worktrees/turn-action-exclusivity/server && npm run deploy
```

**Step 2: Merge to master**

```bash
cd /mnt/c/shuffle-to-ride
git checkout master
git merge feature/turn-action-exclusivity
git push
```

**Step 3: Clean up worktree (optional)**

```bash
git worktree remove .worktrees/turn-action-exclusivity
```
