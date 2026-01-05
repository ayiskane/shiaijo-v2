import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("members")
      .withIndex("by_lastName")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("members") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    groupId: v.string(),
    isGuest: v.boolean(),
    rank: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("members", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("members"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    groupId: v.optional(v.string()),
    rank: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("members") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const bulkCreate = mutation({
  args: {
    members: v.array(v.object({
      firstName: v.string(),
      lastName: v.string(),
      groupId: v.string(),
      isGuest: v.boolean(),
    })),
  },
  handler: async (ctx, { members }) => {
    const ids = [];
    for (const member of members) {
      const id = await ctx.db.insert("members", {
        ...member,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});
