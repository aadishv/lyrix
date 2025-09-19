import { Infer, v, Validator } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { trackValidator } from "../utils";

const getSongValidator = v.object({
  track: v.any() as Validator<Doc<"songs_v2">>,
  saved: v.boolean(),
});
export const getSong = query({
  args: {
    track: v.id("songs_v2"),
  },
  returns: getSongValidator,
  handler: async (ctx, { track }) => {
    const song = await ctx.db.get(track);
    if (!song) throw new Error("Song not found");
    const exists_or_null: Id<"saved_v2"> | null = await ctx.runQuery(api.v2.library.hasSavedTrack, { track });
    const result: Infer<typeof getSongValidator> = { track: song, saved: exists_or_null !== null };
    return result;
  },
});

export const saveTrack = mutation({
  args: {
    track: v.id("songs_v2"),
  },
  handler: async (ctx, { track }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const exists = await ctx.runQuery(api.v2.library.hasSavedTrack, { track });
    if (exists !== null) {
      // TODO: reimplement
      // const comments = await ctx.runQuery(api.comments.getUserCommentsForSong, {
      //   songId: id,
      // });
      // await Promise.all(
      //   comments.map((comment) => {
      //     if (comment.linked == null) {
      //       return ctx.runMutation(api.comments.deleteComment, {
      //         commentId: comment._id,
      //       });
      //     } else {
      //       return ctx.runMutation(api.comments.unlinkCommentFromSong, {
      //         songId: id,
      //         commentId: comment._id,
      //       });
      //     }
      //   }),
      // );
      await ctx.db.delete(exists);
    } else {
      await ctx.db.insert("saved_v2", { user: userId, track });
    }
  },
});

export const getLibrary = query({
  args: {
    filterForComments: v.optional(v.boolean()),
  },
  returns: v.array(
      v.object({
        _id: v.id("songs_v2"),
        _creationTime: v.number(),
        track: v.any(),
        lyrics: v.string(),
        artists: v.array(v.any()),
      })
  ),
  handler: async (ctx, _) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const saved = await ctx.db
      .query("saved_v2")
      .withIndex("user_and_track", (q) => q.eq("user", userId))
      .collect();

    // TODO: reimplement
    // if (args.filterForComments) {
    //   const comments = await ctx.db
    //     .query("comments")
    //     .withIndex("user", (q) => q.eq("user", userId))
    //     .collect();

    //   const linked = await ctx.db
    //     .query("linkedComments")
    //     .withIndex("user", (q) => q.eq("user", userId))
    //     .collect();

    //   const commented = new Set<number>();
    //   for (const c of comments) commented.add(c.song);
    //   for (const l of linked) commented.add(l.song);

    //   return saved.map((s) => s.song).filter((songId) => commented.has(songId));
    // }

    const songs = await Promise.all(saved.map((s) => ctx.db.get(s.track)))
    return songs.filter(s => s !== null);
  },
});

export const hasSavedTrack = query({
  args: {
    track: v.id("songs_v2"),
  },
  returns: v.union(v.id("saved_v2"), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const saved = await ctx.db
      .query("saved_v2")
      .withIndex("user_and_track", (q) =>
        q.eq("user", userId).eq("track", args.track),
      )
      .unique();
    return saved?._id;
  },
});
// NOT DONE (JOSH DUN)
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
