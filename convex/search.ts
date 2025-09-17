import { SpotifyApi, Track } from "@spotify/web-api-ts-sdk";
import { action } from "./_generated/server";
import { v, Validator } from "convex/values";

const sdk = SpotifyApi.withClientCredentials(
  process.env.SPOTIFY_CLIENT_ID!,
  process.env.SPOTIFY_CLIENT_SECRET!,
  [],
);
export const search = action({
  args: {
    query: v.string()
  },
  returns: v.any() as Validator<Track[]>,
  handler: async (_, { query }) => {
    console.log("CALLED!");
    return await sdk
      .search(query, ["track"])
      .then((items) => items.tracks.items);
  }
})
