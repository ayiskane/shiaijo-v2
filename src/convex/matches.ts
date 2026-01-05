import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Score type constants
export const SCORE_TYPES = {
  MEN: 1,
  KOTE: 2,
  DO: 3,
  TSUKI: 4,
  HANSOKU_POINT: 5,
  FORFEIT: 6,
} as const;

function getTotalPoints(scores: number[]): number {
  return scores.length;
}

function checkWinner(
  p1Scores: number[],
  p2Scores: number[],
  matchType: "sanbon" | "ippon" | "hantei"
): "player1" | "player2" | null {
  if (matchType === "hantei") return null; // Hantei matches are decided by judges
  const target = matchType === "sanbon" ? 2 : 1;
  if (getTotalPoints(p1Scores) >= target) return "player1";
  if (getTotalPoints(p2Scores) >= target) return "player2";
  return null;
}

export const getByTournament = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, { tournamentId }) => {
    return await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();
  },
});

export const getByCourt = query({
  args: { 
    tournamentId: v.id("tournaments"),
    court: v.union(v.literal("A"), v.literal("B"))
  },
  handler: async (ctx, { tournamentId, court }) => {
    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();
    return allMatches.filter(m => m.court === court || m.court === "A+B");
  },
});

export const getActiveMatches = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, { tournamentId }) => {
    return await ctx.db
      .query("matches")
      .withIndex("by_tournament_status", (q) => 
        q.eq("tournamentId", tournamentId).eq("status", "in_progress")
      )
      .collect();
  },
});

// Set court assignment for all matches in a group
export const setGroupCourt = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    groupId: v.string(),
    court: v.union(v.literal("A"), v.literal("B"), v.literal("A+B")),
  },
  handler: async (ctx, { tournamentId, groupId, court }) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_group", (q) => 
        q.eq("tournamentId", tournamentId).eq("groupId", groupId)
      )
      .collect();
    
    const now = Date.now();
    for (const match of matches) {
      // Only update pending matches
      if (match.status === "pending") {
        await ctx.db.patch(match._id, { court, updatedAt: now });
      }
    }
    
    return { updatedCount: matches.filter(m => m.status === "pending").length };
  },
});

// Set match type for all matches in a group
export const setGroupMatchType = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    groupId: v.string(),
    matchType: v.union(v.literal("sanbon"), v.literal("ippon")),
  },
  handler: async (ctx, { tournamentId, groupId, matchType }) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_group", (q) => 
        q.eq("tournamentId", tournamentId).eq("groupId", groupId)
      )
      .collect();
    
    const now = Date.now();
    for (const match of matches) {
      // Only update pending matches
      if (match.status === "pending") {
        await ctx.db.patch(match._id, { matchType, updatedAt: now });
      }
    }
    
    return { updatedCount: matches.filter(m => m.status === "pending").length };
  },
});

// Set timer duration for all matches in a group
export const setGroupTimer = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    groupId: v.string(),
    timerDuration: v.number(),
  },
  handler: async (ctx, { tournamentId, groupId, timerDuration }) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_group", (q) => 
        q.eq("tournamentId", tournamentId).eq("groupId", groupId)
      )
      .collect();
    
    const now = Date.now();
    for (const match of matches) {
      // Only update pending matches
      if (match.status === "pending") {
        await ctx.db.patch(match._id, { timerDuration, updatedAt: now });
      }
    }
    
    return { updatedCount: matches.filter(m => m.status === "pending").length };
  },
});

export const addScore = mutation({
  args: {
    matchId: v.id("matches"),
    player: v.union(v.literal("player1"), v.literal("player2")),
    scoreType: v.number(),
  },
  handler: async (ctx, { matchId, player, scoreType }) => {
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error("Match not found");
    if (match.status === "completed") throw new Error("Match already completed");
    
    const p1Scores = [...match.player1Score];
    const p2Scores = [...match.player2Score];
    
    if (player === "player1") p1Scores.push(scoreType);
    else p2Scores.push(scoreType);
    
    const winner = checkWinner(p1Scores, p2Scores, match.matchType);
    
    await ctx.db.patch(matchId, {
      player1Score: p1Scores,
      player2Score: p2Scores,
      ...(winner && {
        winner: winner === "player1" ? match.player1Id : match.player2Id,
        status: "completed" as const,
        actualDuration: match.timerPausedAt || 0,
      }),
      updatedAt: Date.now(),
    });
    
    return { winner, p1Scores, p2Scores };
  },
});

export const addHansoku = mutation({
  args: {
    matchId: v.id("matches"),
    player: v.union(v.literal("player1"), v.literal("player2")),
  },
  handler: async (ctx, { matchId, player }) => {
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error("Match not found");
    if (match.status === "completed") throw new Error("Match already completed");
    
    let p1Hansoku = match.player1Hansoku;
    let p2Hansoku = match.player2Hansoku;
    const p1Scores = [...match.player1Score];
    const p2Scores = [...match.player2Score];
    
    if (player === "player1") {
      p1Hansoku++;
      if (p1Hansoku % 2 === 0) p2Scores.push(SCORE_TYPES.HANSOKU_POINT);
    } else {
      p2Hansoku++;
      if (p2Hansoku % 2 === 0) p1Scores.push(SCORE_TYPES.HANSOKU_POINT);
    }
    
    const winner = checkWinner(p1Scores, p2Scores, match.matchType);
    
    await ctx.db.patch(matchId, {
      player1Hansoku: p1Hansoku,
      player2Hansoku: p2Hansoku,
      player1Score: p1Scores,
      player2Score: p2Scores,
      ...(winner && {
        winner: winner === "player1" ? match.player1Id : match.player2Id,
        status: "completed" as const,
        actualDuration: match.timerPausedAt || 0,
      }),
      updatedAt: Date.now(),
    });
    
    return { winner, p1Hansoku, p2Hansoku };
  },
});

export const undoScore = mutation({
  args: {
    matchId: v.id("matches"),
    player: v.union(v.literal("player1"), v.literal("player2")),
  },
  handler: async (ctx, { matchId, player }) => {
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error("Match not found");
    
    const p1Scores = [...match.player1Score];
    const p2Scores = [...match.player2Score];
    
    if (player === "player1" && p1Scores.length > 0) p1Scores.pop();
    else if (player === "player2" && p2Scores.length > 0) p2Scores.pop();
    
    const wasCompleted = match.status === "completed";
    
    await ctx.db.patch(matchId, {
      player1Score: p1Scores,
      player2Score: p2Scores,
      ...(wasCompleted && { winner: undefined, status: "in_progress" as const }),
      updatedAt: Date.now(),
    });
    
    return { p1Scores, p2Scores, reopened: wasCompleted };
  },
});

export const undoHansoku = mutation({
  args: {
    matchId: v.id("matches"),
    player: v.union(v.literal("player1"), v.literal("player2")),
  },
  handler: async (ctx, { matchId, player }) => {
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error("Match not found");
    
    let p1Hansoku = match.player1Hansoku;
    let p2Hansoku = match.player2Hansoku;
    const p1Scores = [...match.player1Score];
    const p2Scores = [...match.player2Score];
    
    if (player === "player1" && p1Hansoku > 0) {
      if (p1Hansoku % 2 === 0) {
        const idx = p2Scores.lastIndexOf(SCORE_TYPES.HANSOKU_POINT);
        if (idx >= 0) p2Scores.splice(idx, 1);
      }
      p1Hansoku--;
    } else if (player === "player2" && p2Hansoku > 0) {
      if (p2Hansoku % 2 === 0) {
        const idx = p1Scores.lastIndexOf(SCORE_TYPES.HANSOKU_POINT);
        if (idx >= 0) p1Scores.splice(idx, 1);
      }
      p2Hansoku--;
    }
    
    await ctx.db.patch(matchId, {
      player1Hansoku: p1Hansoku,
      player2Hansoku: p2Hansoku,
      player1Score: p1Scores,
      player2Score: p2Scores,
      updatedAt: Date.now(),
    });
    
    return { p1Hansoku, p2Hansoku };
  },
});

export const startMatch = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error("Match not found");
    
    await ctx.db.patch(matchId, {
      status: "in_progress",
      timerStartedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const toggleTimer = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error("Match not found");
    
    const now = Date.now();
    
    if (match.timerStartedAt && !match.timerPausedAt) {
      const elapsed = Math.floor((now - match.timerStartedAt) / 1000);
      await ctx.db.patch(matchId, {
        timerPausedAt: elapsed,
        timerStartedAt: undefined,
        updatedAt: now,
      });
    } else if (match.timerPausedAt) {
      await ctx.db.patch(matchId, {
        timerStartedAt: now - (match.timerPausedAt * 1000),
        timerPausedAt: undefined,
        updatedAt: now,
      });
    }
  },
});

export const declareWinner = mutation({
  args: {
    matchId: v.id("matches"),
    winner: v.union(v.literal("player1"), v.literal("player2")),
  },
  handler: async (ctx, { matchId, winner }) => {
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error("Match not found");
    
    const winnerId = winner === "player1" ? match.player1Id : match.player2Id;
    
    await ctx.db.patch(matchId, {
      winner: winnerId,
      status: "completed",
      actualDuration: match.timerPausedAt || 
        (match.timerStartedAt ? Math.floor((Date.now() - match.timerStartedAt) / 1000) : 0),
      updatedAt: Date.now(),
    });
  },
});

export const declareForfeit = mutation({
  args: {
    matchId: v.id("matches"),
    forfeitingPlayer: v.union(v.literal("player1"), v.literal("player2")),
  },
  handler: async (ctx, { matchId, forfeitingPlayer }) => {
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error("Match not found");
    
    const winnerId = forfeitingPlayer === "player1" ? match.player2Id : match.player1Id;
    const p1Scores = [...match.player1Score];
    const p2Scores = [...match.player2Score];
    
    if (forfeitingPlayer === "player1") p2Scores.push(SCORE_TYPES.FORFEIT);
    else p1Scores.push(SCORE_TYPES.FORFEIT);
    
    await ctx.db.patch(matchId, {
      player1Score: p1Scores,
      player2Score: p2Scores,
      winner: winnerId,
      status: "completed",
      actualDuration: match.timerPausedAt || 0,
      updatedAt: Date.now(),
    });
  },
});
