import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@uidotdev/usehooks";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Song, useTrackSearch } from "@/hooks";
import { useQueryState } from "nuqs";
import SongTable from "@/components/SongTable";
import { useAction } from "convex/react";
import api from "@/cvx";
import { useQuery } from "@tanstack/react-query";
import { Track } from "@spotify/web-api-ts-sdk";

export function convertMsToMs(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number): string => num.toString().padStart(2, "0");

  return `${pad(minutes)}:${pad(seconds)}`;
}

export default function SearchPage() {
  const [query, setQuery] = useQueryState<string>("query", {
    defaultValue: "",
    parse: (v) => v,
  });
  const debouncedQ = useDebounce(query, 250);
  const search = useAction(api.search.search);


  const { data, isLoading } = useQuery({
    queryKey: ["trackSearchv2", debouncedQ],
    queryFn: () => {
      if (!debouncedQ) return Promise.resolve([]);
      // console.log("CALLED!k");
      return search({ query: debouncedQ });
      // return Promise.resolve([] as Track[]);
    },
  });

  const adjustedData: Song[] = (data ?? []).map((item) => ({
    id: 2923750,
    duration: item.duration_ms / 1000,
    trackName: item.name,
    artistName: item.artists.map(a => a.name).join(", "),
    albumName: item.album.name,
    instrumental: false,
    plainLyrics: "SUCKER",
    syncedLyrics: "SUCKER",
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search for a song, artist, or album..."
          value={query}
          onChange={(e) => void setQuery(e.target.value)}
          className="w-full"
        />
      </div>
      <SongTable isLoading={isLoading} data={adjustedData} />
    </div>
  );
}
