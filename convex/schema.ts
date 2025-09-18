import { defineSchema, defineTable } from "convex/server";
import { v, Validator } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { Artist } from "@spotify/web-api-ts-sdk";
import { trackValidator } from "./utils";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  saved: defineTable({
    user: v.id("users"),
    // TODO(rewrite): saved_v2 should link to v.id("songs_v2")
    song: v.number(),
  }).index("user", ["user"]),
  comments: defineTable({
    user: v.id("users"),
    // TODO(rewrite): move to v.id("songs_v2")
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
    // TODO(rewrite): move to v.id("songs_v2")
    song: v.number(),
    user: v.id("users"),
  })
    .index("song_and_user", ["song", "user"])
    .index("user", ["user"]),
  shared: defineTable({
    user: v.id("users"),
    // TODO(rewrite): move to v.id("songs_v2")
    song: v.number(),
    link: v.string(),

    comments: v.union(v.array(
      v.object({
        // can't link to `comments` since this is a
        // snapshot
        start: v.number(),
        end: v.number(),
        color: v.string(),
        title: v.string(),
        content: v.string(),
      }),
    ), v.id("users")),
  }).index("song_and_link", ["song", "link"]),
  // db v2 (data layer)
  songs_v2: defineTable({
    track: trackValidator,
    artists: v.any() as Validator<Artist[]>,
    lyrics: v.string(),
  }).index("track", ["track"]),
  saved_v2: defineTable({
    user: v.id("users"),
    track: v.id("songs_v2"),
  }).index("user_and_track", ["user", "track"]),
});
