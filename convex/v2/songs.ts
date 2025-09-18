// general things pertaining to the main songs_v2 table
import { Artist, SpotifyApi, Track } from "@spotify/web-api-ts-sdk";
import {
  action,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { Infer, v, Validator } from "convex/values";
import { log } from "../../src/lib/utils";
import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { trackValidator } from "../utils";
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
  throw new Error("Missing Spotify credentials");
}
const sdk = SpotifyApi.withClientCredentials(
  process.env.SPOTIFY_CLIENT_ID,
  process.env.SPOTIFY_CLIENT_SECRET,
  [],
);

export const search = action({
  args: {
    query: v.string(),
  },
  returns: v.any() as Validator<Track[]>,
  handler: async (_, { query }) => {
    return log(
      await sdk.search(query, ["track"]).then((items) => items.tracks.items),
    );
  },
});

export const setLyrics = internalMutation({
  args: {
    track: trackValidator,
    lyrics: v.string(),
    artists: v.any() as Validator<Artist[]>,
  },
  returns: v.id("songs_v2"),
  handler: async (ctx, { track, lyrics, artists }) => {
    return await ctx.db.insert("songs_v2", {
      track,
      lyrics,
      artists,
    });
  },
});

export const getTrack = internalQuery({
  args: {
    track: trackValidator,
  },
  returns: v.any() as Validator<Doc<"songs_v2"> | null>,
  handler: async (ctx, { track }) => {
    const existing = await ctx.db
      .query("songs_v2")
      .withIndex("track", (q) => q.eq("track", track as any))
      .unique();
    return existing;
  },
});

const trackGetterValidator = v.union(
  v.object({
    type: v.literal("ok"),
    id: v.id("songs_v2"),
  }),
  v.object({
    type: v.literal("error"),
    message: v.string(),
  }),
);

export const getOrCreateTrack = action({
  args: {
    track: trackValidator,
  },
  // id or error message
  returns: trackGetterValidator,
  handler: async (
    ctx,
    { track },
  ): Promise<Infer<typeof trackGetterValidator>> => {
    const existing = await ctx.runQuery(internal.v2.songs.getTrack, { track });
    if (existing) {
      return {
        type: "ok",
        id: existing._id,
      };
    }
    const params = {
      artist_name: track.artists[0].name,
      duration: (track.duration_ms / 1000).toFixed(0),
      album_name: track.album.name,
      track_name: track.name,
    };
    const query = new URLSearchParams(params);
    try {
      const lyricPromise = fetch(
        `https://lrclib.net/api/get?${query.toString()}`,
      ).then(
        (res) =>
          res.json() as Promise<{ plainLyrics?: string } | { message: string }>,
      );
      const artistPromises = track.artists
        .map((artist) => artist.id)
        .map((id) => sdk.artists.get(id));
      // start all of our fetches in parallel
      const [lyrics, ...artists] = await Promise.all([
        lyricPromise,
        ...artistPromises,
      ]);
      if ("message" in lyrics) {
        return {
          type: "error",
          message: lyrics.message,
        };
      }
      if (!lyrics.plainLyrics) {
        return {
          type: "error",
          message: "No lyrics found",
        };
      }
      const id = await ctx.runMutation(internal.v2.songs.setLyrics, {
        track,
        lyrics: lyrics.plainLyrics,
        artists,
      });
      return {
        type: "ok",
        id,
      };
    } catch (error) {
      return {
        type: "error",
        message: error as string,
      };
    }
  },
});
