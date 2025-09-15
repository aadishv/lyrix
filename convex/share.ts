// import { randomBytes } from "node:crypto";
import { Infer, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { commentValidator } from "./comments";

const randomHex = (): string => {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return hex;
};
export const minimalCommentValidator = v.object({
  start: v.number(),
  end: v.number(),
  color: v.string(),
  title: v.string(),
  content: v.string(),
});
export const sharedValidator = v.object({
  user: v.id("users"),
  song: v.number(),
  link: v.string(),

  comments: v.array(
    minimalCommentValidator
  ),
  _id: v.id("shared"),
  _creationTime: v.number(),
});

const toMinimal = (comments: Infer<typeof commentValidator>[]) => comments.map(c => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, _id, _creationTime, song, linked, ...comment } = c;
  return comment;
});

export const shareSong = mutation({
  args: {
    songId: v.number(),
    live: v.boolean(),
  },
  returns: v.string(), // link
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }
    const { songId } = args;
    const link = randomHex();
    if (!args.live) {
      const comments: Array<Infer<typeof commentValidator>> = await ctx.runQuery(internal.comments.getUserCommentsForSongInternal, {
        songId,
        userId
      });
      await ctx.db.insert("shared", {
        user: userId,
        song: songId,
        link,
        comments: toMinimal(comments),
      });
    } else {
      await ctx.db.insert("shared", {
        user: userId,
        song: songId,
        link,
        comments: userId, // store the user ID for live comments
      });
    }
    return link;
  },
});

export const getSharedComments = query({
  args: {
    songId: v.number(),
    link: v.string(),
  },
  returns: v.union(v.null(), v.array(minimalCommentValidator)),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const items = await ctx.db
      .query("shared")
      .withIndex("song_and_link", (q) =>
        q.eq("song", args.songId).eq("link", args.link),
      )
      .collect();
    if (items.length == 0) {
      return null;
    }
    if (Array.isArray(items[0].comments)) {
      return items[0].comments;
    } else {
     const userComments: Array<Infer<typeof commentValidator>> = await ctx.runQuery(internal.comments.getUserCommentsForSongInternal, {
        songId: args.songId,
        userId: items[0].comments,
      });
      return toMinimal(userComments);
    }
  },
});

export const getSharedCommentsPublic = query({
  args: {
    songId: v.number(),
    link: v.string(),
  },
  returns: v.union(v.null(), v.array(minimalCommentValidator)),
  handler: async (ctx, args) => {
    // This function is public and doesn't require authentication
    const items = await ctx.db
      .query("shared")
      .withIndex("song_and_link", (q) =>
        q.eq("song", args.songId).eq("link", args.link),
      )
      .collect();
    if (items.length == 0) {
      return null;
    }
    if (Array.isArray(items[0].comments)) {
      return items[0].comments;
    } else {
     const userComments: Array<Infer<typeof commentValidator>> = await ctx.runQuery(internal.comments.getUserCommentsForSongInternal, {
        songId: args.songId,
        userId: items[0].comments,
      });
      return toMinimal(userComments);
    }
  },
});
