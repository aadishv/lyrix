import { v, Infer, Validator } from "convex/values";
import { query, mutation, internalQuery } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";

// gpt/gemini
function getRandomPastelRGBA() {
  // Generate a random hue (0-360)
  const hue = Math.floor(Math.random() * 361);

  // Set saturation and lightness for pastel colors
  // Saturation typically low-medium (e.g., 50-70%)
  const saturation = Math.floor(Math.random() * 21) + 50; // 50-70%
  // Lightness typically high (e.g., 70-90%)
  const lightness = Math.floor(Math.random() * 21) + 70; // 70-90%

  // Set a fixed alpha value, or randomize it if needed (e.g., 0.5 - 1.0)
  const alpha = 1; // Fully opaque

  // Convert HSL to RGB (a common conversion algorithm is needed here)
  // For simplicity, we'll use a direct HSL to RGB conversion formula
  // Note: This is a simplified example; full HSL to RGB conversion is more complex.
  // A common approach involves converting HSL to RGB, then using those values.

  // A more robust approach would be to use a library or a well-tested HSL to RGB conversion function.
  // For a basic approximation suitable for pastel, we can directly manipulate RGB values to be high.

  // Alternatively, directly generate high RGB values for a pastel effect:
  const r = Math.floor(Math.random() * 100) + 155; // 155-255
  const g = Math.floor(Math.random() * 100) + 155; // 155-255
  const b = Math.floor(Math.random() * 100) + 155; // 155-255

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const commentValidator = v.any() as Validator<
  Doc<"comments_v2"> & {
    // if it is unlinked, null; otherwise the original song
    linked: Doc<"songs_v2"> | null;
  }
>;

export const getUserCommentsForSongInternal = internalQuery({
  args: {
    songId: v.id("songs_v2"),
    userId: v.id("users"),
  },
  returns: v.array(commentValidator),
  handler: async (ctx, args) => {
    const { userId } = args;
    // ACTUAL comments
    const comments: Array<Infer<typeof commentValidator>> = (
      await ctx.db
        .query("comments_v2")
        .withIndex("track_and_user", (q) =>
          q.eq("track", args.songId).eq("user", userId),
        )
        .collect()
    ).map((obj) => ({ ...obj, linked: null }));
    // linked comments
    const linkedComments: Array<Infer<typeof commentValidator>> = await ctx.db
      .query("linkedComments_v2")
      .withIndex("track_and_user", (q) =>
        q.eq("track", args.songId).eq("user", userId),
      )
      .collect()
      .then((linkedCommentsRaw) =>
        Promise.all(
          linkedCommentsRaw.map((comment) =>
            ctx.db.get(comment.comment).then((ogComment) =>
              ctx.db.get(ogComment!.track).then((track) => ({
                ...ogComment!,
                start: comment.start,
                end: comment.end,
                linked: track!,
              })),
            ),
          ),
        ),
      );
    return comments.concat(linkedComments);
  },
});

export const getUserCommentsForSong = query({
  args: {
    songId: v.id("songs_v2"),
  },
  returns: v.array(commentValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    // ACTUAL comments
    const comments: Array<Infer<typeof commentValidator>> = await ctx.runQuery(
      internal.v2.comments.getUserCommentsForSongInternal,
      {
        songId: args.songId,
        userId,
      },
    );
    return comments;
  },
});

// NOT DONE (JOSH DUN)
// export const getUserComments = query({
//   args: {},
//   returns: v.array(commentValidator),
//   handler: async (ctx): Promise<Array<Infer<typeof commentValidator>>> => {
//     const userId = await getAuthUserId(ctx);
//     if (!userId) throw new Error("Unauthenticated");
//     // ACTUAL comments
//     return ctx.runQuery(internal.v2.comments.getUserCommentsInternal, {
//       userId,
//     });
//   },
// });

export const updateComment = mutation({
  args: {
    id: v.id("comments_v2"),
    title: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...args }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const comment = await ctx.db.get(id);
    if (!comment) throw new Error("Comment not found");
    if (comment.user !== userId) throw new Error("Permission denied");
    await ctx.db.patch(id, {
      title: args.title,
      content: args.content,
    });
  },
});

export const deleteComment = mutation({
  args: {
    id: v.id("comments_v2"),
  },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const comment = await ctx.db.get(id);
    if (!comment) throw new Error("Comment not found");
    if (comment.user !== userId) throw new Error("Permission denied");

    const links = await ctx.db
      .query("linkedComments_v2")
      .withIndex("comment", (q) => q.eq("comment", id))
      .collect();

    for (const link of links) {
      if (link.comment === id) {
        await ctx.db.delete(link._id);
      }
    }
    await ctx.db.delete(id);
    return null;
  },
});

export const newComment = mutation({
  args: {
    track: v.id("songs_v2"),
    start: v.number(),
    end: v.number(),
  },
  returns: v.id("comments_v2"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    return await ctx.db.insert("comments_v2", {
      ...args,
      user: userId,
      color: getRandomPastelRGBA(), // Default color
      title: "",
      content: "",
    });
  },
});

// NOT DONE (JOSH DUN)
// export const unlinkCommentFromSong = mutation({
//   args: {
//     commentId: v.id("comments"),
//     songId: v.number(),
//   },
//   returns: v.null(),
//   handler: async (ctx, args) => {
//     const userId = await getAuthUserId(ctx);
//     if (!userId) throw new Error("Unauthenticated");
//     // Find the linkedComment entry for this comment and song for this user
//     const links = await ctx.db
//       .query("linkedComments")
//       .withIndex("song_and_user", (q) =>
//         q.eq("song", args.songId).eq("user", userId),
//       )
//       .collect();
//     for (const link of links) {
//       if (link.comment === args.commentId) {
//         await ctx.db.delete(link._id);
//       }
//     }
//     return null;
//   },
// });

// // NOT DONE (JOSH DUN)
// export const linkCommentToSong = mutation({
//   args: {
//     commentId: v.id("comments"),
//     songId: v.number(),
//     start: v.number(),
//     end: v.number(),
//   },
//   returns: v.id("linkedComments"),
//   handler: async (ctx, args) => {
//     const userId = await getAuthUserId(ctx);
//     if (!userId) throw new Error("Unauthenticated");
//     const comment = await ctx.db.get(args.commentId);
//     if (!comment) throw new Error("Comment not found");
//     // Only allow linking if the comment belongs to the user
//     if (comment.user !== userId) throw new Error("Permission denied");
//     // Create a linkedComment entry
//     return await ctx.db.insert("linkedComments", {
//       comment: args.commentId,
//       start: args.start,
//       end: args.end,
//       song: args.songId,
//       user: userId,
//     });
//   },
// });

// // NOT DONE (JOSH DUN) is a reference to
