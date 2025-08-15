import { v, Infer } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
const colors: string[] = [
  "rgba(255, 154, 162, 0.7)", // Red (Watermelon)
  "rgba(255, 183, 107, 0.7)", // Orange (Cantaloupe)
  "rgba(255, 229, 127, 0.7)", // Yellow (Banana)
  "rgba(142, 223, 168, 0.7)", // Green (Honeydew)
  "rgba(131, 203, 238, 0.7)", // Blue (Blueberry)
];

export const commentValidator = v.object({
  user: v.id("users"),
  content: v.string(),
  start: v.number(),
  end: v.number(),
  color: v.string(),
  title: v.string(),
  _id: v.id("comments"),
  _creationTime: v.number(),
  song: v.number(),
  linked: v.union(v.number(), v.null()),
});

export const getUserCommentsForSongInternal = internalQuery({
  args: {
    songId: v.number(),
    userId: v.id("users"),
  },
  returns: v.array(commentValidator),
  handler: async (ctx, args) => {
    const { userId } = args;
    // ACTUAL comments
    const comments = (
      await ctx.db
        .query("comments")
        .withIndex("song_and_user", (q) =>
          q.eq("song", args.songId).eq("user", userId),
        )
        .collect()
    ).map((obj) => ({ ...obj, linked: null as number | null }));
    // linked comments
    const linkedCommentsRaw = await ctx.db
      .query("linkedComments")
      .withIndex("song_and_user", (q) =>
        q.eq("song", args.songId).eq("user", userId),
      )
      .collect();
    const linkedComments = await Promise.all(
      linkedCommentsRaw.map(async (comment) => {
        const com = (await ctx.db.get(comment.comment))!;
        return {
          ...com,
          start: comment.start,
          end: comment.end,
          linked: com.song,
        };
      }),
    );
    // sort by 1) .start, 2) .end
    return comments.concat(linkedComments).sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return a.end - b.end;
    });
  },
});
export const getUserCommentsForSong = query({
  args: {
    songId: v.number(),
  },
  returns: v.array(commentValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    // ACTUAL comments
    const comments: Array<Infer<typeof commentValidator>> = await ctx.runQuery(internal.comments.getUserCommentsForSongInternal, {
      songId: args.songId,
      userId,
    });
    return comments;
  },
});

export const getUserComments = query({
  args: {},
  returns: v.array(commentValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    // ACTUAL comments
    const comments = (
      await ctx.db
        .query("comments")
        .withIndex("user", (q) => q.eq("user", userId))
        .collect()
    ).map((obj) => ({ ...obj, linked: null as number | null }));
    // linked comments
    const linkedCommentsRaw = await ctx.db
      .query("linkedComments")
      .withIndex("user", (q) => q.eq("user", userId))
      .collect();
    const linkedComments = await Promise.all(
      linkedCommentsRaw.map(async (comment) => {
        const com = (await ctx.db.get(comment.comment))!;
        return {
          ...com,
          start: comment.start,
          end: comment.end,
          linked: com.song,
          song: comment.song,
        };
      }),
    );
    // sort by 1) .start, 2) .end
    return comments.concat(linkedComments).sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return a.end - b.end;
    });
  },
});

/**
 * Update a comment's title and content, checking user permission.
 */
export const updateComment = mutation({
  args: {
    commentId: v.id("comments"),
    title: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.user !== userId) throw new Error("Permission denied");
    await ctx.db.patch(args.commentId, {
      title: args.title,
      content: args.content,
    });
  },
});

/**
 * Delete a comment, checking user permission.
 */
export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.user !== userId) throw new Error("Permission denied");
    // Delete any linkedComments referencing this comment
    const links = await ctx.db
      .query("linkedComments")
      .withIndex(
        "song_and_user",
        (q) => q, // index is ["song", "user"], so we need to filter manually
      )
      .collect();
    for (const link of links) {
      if (link.comment === args.commentId) {
        await ctx.db.delete(link._id);
      }
    }
    await ctx.db.delete(args.commentId);
    return null;
  },
});

export const newComment = mutation({
  args: {
    song: v.number(),
    start: v.number(),
    end: v.number(),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    return await ctx.db.insert("comments", {
      ...args,
      user: userId,
      color: colors[Math.floor(Math.random() * colors.length)], // Default color
      title: "",
      content: "",
    });
  },
});

/**
 * Unlink a comment from a song for the current user.
 */
export const unlinkCommentFromSong = mutation({
  args: {
    commentId: v.id("comments"),
    songId: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    // Find the linkedComment entry for this comment and song for this user
    const links = await ctx.db
      .query("linkedComments")
      .withIndex("song_and_user", (q) =>
        q.eq("song", args.songId).eq("user", userId),
      )
      .collect();
    for (const link of links) {
      if (link.comment === args.commentId) {
        await ctx.db.delete(link._id);
      }
    }
    return null;
  },
});

/**
 * Link an existing comment to a song for the current user.
 */
export const linkCommentToSong = mutation({
  args: {
    commentId: v.id("comments"),
    songId: v.number(),
    start: v.number(),
    end: v.number(),
  },
  returns: v.id("linkedComments"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    // Only allow linking if the comment belongs to the user
    if (comment.user !== userId) throw new Error("Permission denied");
    // Create a linkedComment entry
    return await ctx.db.insert("linkedComments", {
      comment: args.commentId,
      start: args.start,
      end: args.end,
      song: args.songId,
      user: userId,
    });
  },
});
