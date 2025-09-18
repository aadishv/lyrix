import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
// import { Song, SongConvexs } from "../src/api"
export const saveSong = mutation({
  args: {
    id: v.number(),
  },

  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const exists = await ctx.runQuery(api.library.hasSavedSong, {
      songId: id,
    });
    if (exists != null) {
      const comments = await ctx.runQuery(api.comments.getUserCommentsForSong, {
        songId: id,
      });
      await Promise.all(
        comments.map((comment) => {
          if (comment.linked == null) {
            return ctx.runMutation(api.comments.deleteComment, {
              commentId: comment._id,
            });
          } else {
            return ctx.runMutation(api.comments.unlinkCommentFromSong, {
              songId: id,
              commentId: comment._id,
            });
          }
        }),
      );
      await ctx.db.delete(exists);
    } else {
      await ctx.db.insert("saved", { user: userId, song: id });
    }
  },
});

export const getLibrary = query({
  args: {
    filterForComments: v.optional(v.boolean()),
  },
  returns: v.array(v.number()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const saved = await ctx.db
      .query("saved")
      .withIndex("user", (q) => q.eq("user", userId))
      .collect();

    if (args.filterForComments) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("user", (q) => q.eq("user", userId))
        .collect();

      const linked = await ctx.db
        .query("linkedComments")
        .withIndex("user", (q) => q.eq("user", userId))
        .collect();

      const commented = new Set<number>();
      for (const c of comments) commented.add(c.song);
      for (const l of linked) commented.add(l.song);

      return saved.map((s) => s.song).filter((songId) => commented.has(songId));
    }

    return saved.map((s) => s.song);
  },
});

export const hasSavedSong = query({
  args: {
    songId: v.number(),
  },
  returns: v.union(v.id("saved"), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const saved = await ctx.db
      .query("saved")
      .withIndex("user", (q) => q.eq("user", userId))
      .filter((q) => q.eq(q.field("song"), args.songId))
      .unique();
    if (!saved) {
      return null;
    }
    return saved._id;
  },
});

export const batchedHasSavedSong = query({
  args: {
    songIds: v.array(v.number()),
  },
  returns: v.array(v.union(v.id("saved"), v.null())),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return args.songIds.map(() => null);

    // Fetch all saved songs for this user in one query
    const savedSongs = await ctx.db
      .query("saved")
      .withIndex("user", (q) => q.eq("user", userId))
      .collect();

    // Build a map from songId to saved record _id
    const songIdToSavedId = new Map<number, Id<"saved">>();
    for (const saved of savedSongs) {
      songIdToSavedId.set(saved.song, saved._id);
    }

    // Return an array of saved _id or null for each songId
    return args.songIds.map((songId) => songIdToSavedId.get(songId) ?? null);
  },
});
