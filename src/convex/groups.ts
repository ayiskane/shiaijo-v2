import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("groups")
      .withIndex("by_order")
      .collect();
  },
});

export const create = mutation({
  args: {
    groupId: v.string(),
    name: v.string(),
    isHantei: v.boolean(),
  },
  handler: async (ctx, { groupId, name, isHantei }) => {
    // Get max order
    const groups = await ctx.db.query("groups").collect();
    const maxOrder = groups.length > 0 ? Math.max(...groups.map(g => g.order)) : 0;
    
    return await ctx.db.insert("groups", {
      groupId,
      name,
      isHantei,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("groups"),
    groupId: v.string(),
    name: v.string(),
    isHantei: v.boolean(),
  },
  handler: async (ctx, { id, groupId, name, isHantei }) => {
    await ctx.db.patch(id, { groupId, name, isHantei });
  },
});

export const remove = mutation({
  args: { id: v.id("groups") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
