import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  saved: defineTable({
    user: v.id("users"),
    song: v.number(),
  }).index("user", ["user"]),
  comments: defineTable({
    user: v.id("users"),
    song: v.number(),
    start: v.number(),
    end: v.number(),
    color: v.string(),
    title: v.string(),
    content: v.string(),
  })
    .index("song_and_user", ["song", "user"])
    .index("user", ["user"]),
  linkedComments: defineTable({
    comment: v.id("comments"),
    start: v.number(),
    end: v.number(),
    song: v.number(),
    user: v.id("users"),
  })
    .index("song_and_user", ["song", "user"])
    .index("user", ["user"]),
  shared: defineTable({
    user: v.id("users"),
    song: v.number(),
    link: v.string(),

    comments: v.array(
      v.object({
        // can't link to `comments` since this is a
        // snapshot
        start: v.number(),
        end: v.number(),
        color: v.string(),
        title: v.string(),
        content: v.string(),
      }),
    ),
  }).index("song_and_link", ["song", "link"]),
});
