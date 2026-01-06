import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Court State Persistence
 * 
 * Stores the current state of each court (A/B) for a tournament:
 * - currentMatchId: the match currently being played
 * - selectedMatchId: the match selected in the UI (may differ from current)
 * - groupOrder: custom ordering of groups for this court
 * - sharedGroups: groups assigned to both courts (A+B)
 * 
 * This allows courtkeeper to restore state after page refresh.
 */

export const getByTournamentCourt = query({
  args: {
    tournamentId: v.id("tournaments"),
    court: v.union(v.literal("A"), v.literal("B")),
  },
  handler: async (ctx, { tournamentId, court }) => {
    return await ctx.db
      .query("courtState")
      .withIndex("by_tournament_court", (q) =>
        q.eq("tournamentId", tournamentId).eq("court", court)
      )
      .first();
  },
});

export const getByTournament = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, { tournamentId }) => {
    const states = await ctx.db
      .query("courtState")
      .withIndex("by_tournament_court", (q) => q.eq("tournamentId", tournamentId))
      .collect();
    return {
      A: states.find((s) => s.court === "A") || null,
      B: states.find((s) => s.court === "B") || null,
    };
  },
});

export const upsert = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    court: v.union(v.literal("A"), v.literal("B")),
    currentMatchId: v.optional(v.id("matches")),
    selectedMatchId: v.optional(v.id("matches")),
    groupOrder: v.optional(v.array(v.string())),
    sharedGroups: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { tournamentId, court, ...updates }) => {
    const existing = await ctx.db
      .query("courtState")
      .withIndex("by_tournament_court", (q) =>
        q.eq("tournamentId", tournamentId).eq("court", court)
      )
      .first();

    if (existing) {
      // Only update fields that were provided
      const patchData: Record<string, unknown> = {};
      if (updates.currentMatchId !== undefined) patchData.currentMatchId = updates.currentMatchId;
      if (updates.selectedMatchId !== undefined) patchData.selectedMatchId = updates.selectedMatchId;
      if (updates.groupOrder !== undefined) patchData.groupOrder = updates.groupOrder;
      if (updates.sharedGroups !== undefined) patchData.sharedGroups = updates.sharedGroups;
      
      if (Object.keys(patchData).length > 0) {
        await ctx.db.patch(existing._id, patchData);
      }
      return existing._id;
    } else {
      // Create new court state
      return await ctx.db.insert("courtState", {
        tournamentId,
        court,
        currentMatchId: updates.currentMatchId,
        selectedMatchId: updates.selectedMatchId,
        groupOrder: updates.groupOrder || [],
        sharedGroups: updates.sharedGroups || [],
      });
    }
  },
});

export const setCurrentMatch = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    court: v.union(v.literal("A"), v.literal("B")),
    matchId: v.optional(v.id("matches")),
  },
  handler: async (ctx, { tournamentId, court, matchId }) => {
    const existing = await ctx.db
      .query("courtState")
      .withIndex("by_tournament_court", (q) =>
        q.eq("tournamentId", tournamentId).eq("court", court)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { currentMatchId: matchId });
    } else {
      await ctx.db.insert("courtState", {
        tournamentId,
        court,
        currentMatchId: matchId,
        selectedMatchId: matchId,
        groupOrder: [],
        sharedGroups: [],
      });
    }
  },
});

export const clearForTournament = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, { tournamentId }) => {
    const states = await ctx.db
      .query("courtState")
      .withIndex("by_tournament_court", (q) => q.eq("tournamentId", tournamentId))
      .collect();

    for (const state of states) {
      await ctx.db.delete(state._id);
    }

    return { deletedCount: states.length };
  },
});