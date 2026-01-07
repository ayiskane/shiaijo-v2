import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const SENSEI_GROUP_ID = "SEN";
const SENSEI_GROUP_NAME = "Sensei";

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
    // Get max order using index for efficiency
    const lastGroup = await ctx.db
      .query("groups")
      .withIndex("by_order")
      .order("desc")
      .first();
    const maxOrder = lastGroup?.order ?? 0;
    
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
    const group = await ctx.db.get(id);
    if (group?.groupId === SENSEI_GROUP_ID) {
      throw new Error("Cannot delete Sensei group");
    }
    await ctx.db.delete(id);
  },
});

export const ensureSensei = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("groups")
      .withIndex("by_groupId", (q) => q.eq("groupId", SENSEI_GROUP_ID))
      .first();
    if (existing) {
      const members = await ctx.db
        .query("members")
        .withIndex("by_groupId", (q) => q.eq("groupId", SENSEI_GROUP_ID))
        .collect();
      for (const member of members) {
        if (!member.isAdmin) {
          await ctx.db.patch(member._id, { isAdmin: true });
        }
      }
      return existing;
    }

    const lastGroup = await ctx.db
      .query("groups")
      .withIndex("by_order")
      .order("desc")
      .first();
    const maxOrder = lastGroup?.order ?? 0;

    const id = await ctx.db.insert("groups", {
      groupId: SENSEI_GROUP_ID,
      name: SENSEI_GROUP_NAME,
      isHantei: false,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
    const members = await ctx.db
      .query("members")
      .withIndex("by_groupId", (q) => q.eq("groupId", SENSEI_GROUP_ID))
      .collect();
    for (const member of members) {
      if (!member.isAdmin) {
        await ctx.db.patch(member._id, { isAdmin: true });
      }
    }
    return await ctx.db.get(id);
  },
});
