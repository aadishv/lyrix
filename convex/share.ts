// import { randomBytes } from "node:crypto";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const randomHex = (): string => {
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

export const shareSong = mutation({
  args: {
    songId: v.number(),
  },
  returns: v.string(), // link
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }
    const { songId } = args;
    const comments = await ctx.runQuery(api.comments.getUserCommentsForSong, {
      songId,
    });
    const link = randomHex();
    await ctx.db.insert("shared", {
      user: userId,
      song: songId,
      link,
      comments: comments.map(c => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { user, _id, _creationTime, song, linked, ...comment } = c;
        return comment;
      }),
    });
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
    return items[0].comments;
  },
});
