import { mutation } from "./_generated/server";

// Demo data seed script for History Tab showcase
export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Check if already seeded
    const existingGroups = await ctx.db.query("groups").collect();
    if (existingGroups.length > 0) {
      return { message: "Data already exists, skipping seed" };
    }

    // Create Groups
    const groups = [
      { groupId: "YUD", name: "Youth Division", isHantei: false, order: 1 },
      { groupId: "MUD", name: "Mudansha", isHantei: false, order: 2 },
      { groupId: "YKD", name: "Yudansha", isHantei: false, order: 3 },
      { groupId: "BEG", name: "Beginners", isHantei: true, order: 4 },
      { groupId: "INT", name: "Intermediate", isHantei: true, order: 5 },
      { groupId: "SEN", name: "Sensei", isHantei: false, order: 6 },
    ];

    for (const g of groups) {
      await ctx.db.insert("groups", { ...g, createdAt: now });
    }

    // Create Members
    const members = [
      // Youth Division
      { firstName: "Kenji", lastName: "Tanaka", groupId: "YUD" },
      { firstName: "Yuki", lastName: "Sato", groupId: "YUD" },
      { firstName: "Hana", lastName: "Yamamoto", groupId: "YUD" },
      { firstName: "Riku", lastName: "Nakamura", groupId: "YUD" },
      // Mudansha
      { firstName: "Takeshi", lastName: "Suzuki", groupId: "MUD" },
      { firstName: "Akiko", lastName: "Watanabe", groupId: "MUD" },
      { firstName: "Daiki", lastName: "Ito", groupId: "MUD" },
      { firstName: "Mika", lastName: "Kobayashi", groupId: "MUD" },
      { firstName: "Shota", lastName: "Kato", groupId: "MUD" },
      // Yudansha
      { firstName: "Hiroshi", lastName: "Yamada", groupId: "YKD" },
      { firstName: "Sachiko", lastName: "Takahashi", groupId: "YKD" },
      { firstName: "Masaru", lastName: "Yoshida", groupId: "YKD" },
      { firstName: "Emi", lastName: "Sasaki", groupId: "YKD" },
      // Beginners (Hantei)
      { firstName: "Taro", lastName: "Kimura", groupId: "BEG" },
      { firstName: "Ayumi", lastName: "Hayashi", groupId: "BEG" },
      { firstName: "Koji", lastName: "Shimizu", groupId: "BEG" },
      // Intermediate (Hantei)
      { firstName: "Naomi", lastName: "Mori", groupId: "INT" },
      { firstName: "Yuji", lastName: "Inoue", groupId: "INT" },
      { firstName: "Megumi", lastName: "Ogawa", groupId: "INT" },
      // Sensei
      { firstName: "Takashi", lastName: "Sensei", groupId: "SEN" },
    ];

    const memberIds: string[] = [];
    for (const m of members) {
      const id = await ctx.db.insert("members", {
        ...m,
        isGuest: false,
        createdAt: now,
      });
      memberIds.push(id);
    }

    // Create completed tournaments with matches
    const tournaments = [
      { name: "Spring Championship 2025", date: "2025-04-15", status: "completed" as const },
      { name: "Summer Invitational 2025", date: "2025-07-20", status: "completed" as const },
      { name: "Fall Classic 2025", date: "2025-10-12", status: "completed" as const },
      { name: "Winter Tournament 2025", date: "2025-12-08", status: "completed" as const },
      { name: "New Year Taikai 2026", date: "2026-01-05", status: "completed" as const },
    ];

    // Helper to get member IDs by group
    const getMembersByGroup = (groupId: string) => {
      return members
        .map((m, i) => ({ ...m, id: memberIds[i] }))
        .filter((m) => m.groupId === groupId);
    };

    for (const t of tournaments) {
      const tournamentId = await ctx.db.insert("tournaments", {
        name: t.name,
        date: t.date,
        status: t.status,
        hanteiConfig: { round1: "K-M", round2: "M-K-D" },
        timerOptions: [60, 120, 180, 240, 300],
        defaultTimerDuration: 180,
        timerDisplayMode: "up",
        createdAt: now,
      });

      // Add participants for each group
      const groupsToUse = ["YUD", "MUD", "YKD", "BEG", "INT"];
      for (const groupId of groupsToUse) {
        const groupMembers = getMembersByGroup(groupId);
        for (const member of groupMembers) {
          await ctx.db.insert("participants", {
            tournamentId,
            memberId: member.id as any,
            groupId,
          });
        }

        // Generate round-robin matches with random results
        const group = groups.find((g) => g.groupId === groupId);
        const isHantei = group?.isHantei || false;

        if (groupMembers.length >= 2) {
          let orderIndex = 0;
          for (let i = 0; i < groupMembers.length; i++) {
            for (let j = i + 1; j < groupMembers.length; j++) {
              const p1 = groupMembers[i];
              const p2 = groupMembers[j];

              // Generate random scores
              const p1Wins = Math.random() > 0.5;
              const p1Score = p1Wins ? [1, 2] : Math.random() > 0.3 ? [1] : [];
              const p2Score = !p1Wins ? [1, 3] : Math.random() > 0.3 ? [2] : [];

              // Determine winner
              let winner: string | undefined;
              if (p1Score.length >= 2) winner = p1.id;
              else if (p2Score.length >= 2) winner = p2.id;
              else if (p1Score.length === 1 && p2Score.length === 1) winner = undefined; // tie
              else if (p1Score.length > p2Score.length) winner = p1.id;
              else if (p2Score.length > p1Score.length) winner = p2.id;

              await ctx.db.insert("matches", {
                tournamentId,
                groupId,
                player1Id: p1.id as any,
                player2Id: p2.id as any,
                court: isHantei ? "B" : "A",
                status: "completed",
                player1Score: p1Score,
                player2Score: p2Score,
                player1ScoreTimes: p1Score.map((_, idx) => 30 + idx * 45),
                player2ScoreTimes: p2Score.map((_, idx) => 60 + idx * 40),
                player1Hansoku: 0,
                player2Hansoku: 0,
                winner: winner as any,
                matchType: isHantei ? "hantei" : "sanbon",
                timerDuration: isHantei ? 0 : 180,
                round: 1,
                orderIndex: orderIndex++,
                isSuddenDeath: false,
                updatedAt: now,
              });
            }
          }
        }
      }
    }

    return {
      message: "Demo data seeded successfully!",
      groups: groups.length,
      members: members.length,
      tournaments: tournaments.length,
    };
  },
});

// Clear all demo data
export const clearDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all matches
    const matches = await ctx.db.query("matches").collect();
    for (const m of matches) await ctx.db.delete(m._id);

    // Delete all participants
    const participants = await ctx.db.query("participants").collect();
    for (const p of participants) await ctx.db.delete(p._id);

    // Delete all tournaments
    const tournaments = await ctx.db.query("tournaments").collect();
    for (const t of tournaments) await ctx.db.delete(t._id);

    // Delete all members
    const members = await ctx.db.query("members").collect();
    for (const m of members) await ctx.db.delete(m._id);

    // Delete all groups
    const groups = await ctx.db.query("groups").collect();
    for (const g of groups) await ctx.db.delete(g._id);

    return { message: "All demo data cleared" };
  },
});
