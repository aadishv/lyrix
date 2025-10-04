import { useQuery } from "convex/react";
import api from "@/cvx";
import { useQueryState } from "nuqs";
import Fuse from "fuse.js";
import { Input } from "@/components/ui/input";
import { ScrollText } from "lucide-react";
import uFuzzy from "@leeoniya/ufuzzy";
import { useMemo, useCallback } from "react";
import { useAction, useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import { ListMusic, Bookmark } from "lucide-react";
import Confirm from "@/components/Confirm";
import { toast } from "sonner";

export default function LyricsPage() {
  const data = useQuery(api.v2.library.getLibrary, {
    filterForComments: false,
  });
  const library = useQuery(api.v2.library.getLibrary, {
    filterForComments: false,
  });
  const libraryUris = useMemo(
    () => new Set(library?.map((s) => s.track.uri) ?? []),
    [library],
  );
  const saveSong = useMutation(api.v2.library.saveTrack);
  const openAction = useAction(api.v2.songs.getOrCreateTrack);
  const getId = useCallback(
    async (track: any) => {
      const id = await openAction({ track });
      if (id.type === "error") {
        toast.error(`Failed to fetch lyrics: ${id.message}`);
        throw new Error(`Failed to fetch lyrics: ${id.message}`);
      } else {
        return id.id;
      }
    },
    [openAction],
  );
  const open = useCallback(
    (track: any) => {
      void getId(track).then((id) => {
        toast.success("Lyrics fetched successfully! Redirecting now...");
        window.open(`/song_v2?id=${id}`, "_blank")?.focus();
      });
    },
    [getId],
  );

  const searchData = useMemo(() => {
    if (!data) return [];
    return data.map((item) => ({
      lyrics: item.lyrics,
      name: item.track.name,
      artistName: item.track.artists.map((a) => a.name).join(", "),
      albumName: item.track.album.name,
      item,
    }));
  }, [data]);

  const [query, setQuery] = useQueryState<string>("query", {
    defaultValue: "",
    parse: (v) => v,
  });

  const fuse = useMemo(() => {
    if (!searchData.length) return null;
    const options = {
      keys: [
        { name: "lyrics", weight: 0.5 },
        { name: "name", weight: 0.2 },
        { name: "artistName", weight: 0.15 },
        { name: "albumName", weight: 0.15 },
      ],
      threshold: 0.2,
      ignoreLocation: true,
      minMatchCharLength: 3,
      includeMatches: true,
    };
    return new Fuse(searchData, options);
  }, [searchData]);

  const filteredResults = useMemo(() => {
    if (!data) return [];
    if (!query.trim())
      return data.map((item) => ({ item: { item }, matches: [] }));
    if (!fuse) return data.map((item) => ({ item: { item }, matches: [] }));
    const results = fuse.search(query);
    return results;
  }, [data, query, fuse, searchData]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row font-serif gap-2">
        <ScrollText />
        <h1>Lyrics</h1>
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search your lyrics..."
          value={query}
          onChange={(e) => void setQuery(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="flex flex-col gap-4">
        {filteredResults?.map((result) => (
          <div
            key={result.item.item._id}
            className="border-b border-border pb-4"
          >
            <MinimalSongDetails
              result={result}
              open={open}
              saveSong={saveSong}
              libraryUris={libraryUris}
              getId={getId}
              query={query}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const MinimalSongDetails = ({
  result,
  open,
  saveSong,
  libraryUris,
  getId,
  query,
}: {
  result: any;
  open: any;
  saveSong: any;
  libraryUris: any;
  getId: any;
  query: string;
}) => {
  const item = result.item.item;
  const lines = item.lyrics.split("\n");
  let snippet = "";
  let ranges: [number, number][] = [];
  const lyricsMatch = result.matches?.find((m: any) => m.key === "lyrics");

  if (lyricsMatch) {
    // Use uFuzzy to find the best matching line
    const lines = item.lyrics.split("\n");
    const uf = new uFuzzy();
    const [idxs, info] = uf.search(lines, query);
    if (idxs && idxs.length > 0) {
      const bestLineIdx = idxs[0];
      const startLine = Math.max(0, bestLineIdx - 4);
      const endLine = Math.min(lines.length, bestLineIdx + 5);
      snippet = lines.slice(startLine, endLine).join("\n");

      // Get highlight ranges for the best line
      const line = lines[bestLineIdx];
      const words = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3);
      const lineLower = line.toLowerCase();
      let lineRanges: [number, number][] = [];
      for (const word of words) {
        let start = 0;
        while ((start = lineLower.indexOf(word, start)) !== -1) {
          lineRanges.push([start, start + word.length]);
          start += word.length;
        }
      }
      // Compute offset of the best line in snippet
      const lineOffset = lines
        .slice(startLine, bestLineIdx)
        .reduce((acc: number, line: string) => acc + line.length + 1, 0);
      ranges = lineRanges.map(([s, e]: [number, number]) => [
        s + lineOffset,
        e + lineOffset,
      ]);
    } else {
      // Fallback to first 10 lines
      snippet = lines.slice(0, 10).join("\n");
    }
  } else {
    snippet = lines.slice(0, 10).join("\n");
  }

  if (!snippet.trim()) {
    snippet = "No lyrics available";
  }

  const song = item.track;
  const isSaved = libraryUris.has(song.uri);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <img
          src={item.track.album.images[0]?.url}
          className="h-12 w-12"
          alt="Album cover"
        />
        <div>
          <h3 className="font-semibold">{item.track.name}</h3>
          <p className="text-sm text-muted-foreground">
            {item.track.artists.map((a: any) => a.name).join(", ")}
          </p>
        </div>
      </div>
      <pre className="whitespace-pre-wrap text-sm bg-muted p-2 rounded">
        {highlightText(snippet, ranges)}
      </pre>
      <div className="flex gap-1">
        <Confirm
          onConfirm={() => {
            void getId(song).then((track: any) => {
              saveSong({ track })
                .then(() =>
                  toast.success(
                    isSaved
                      ? "Song removed from library"
                      : "Song saved to library",
                  ),
                )
                .catch((e: any) =>
                  toast.error(`Failed to save song to library: ${e.message}`),
                );
            });
          }}
          action="Remove song from library"
          message="Removing this song from your library also permanently deletes all associated comments."
          disabled={!isSaved}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label={
              isSaved ? "Remove song from library" : "Save song to library"
            }
            title={
              isSaved ? "Remove song from library" : "Save song to library"
            }
          >
            <Bookmark
              className="h-4 w-4"
              fill={isSaved ? "#000" : "none"}
              stroke="#000"
            />
          </Button>
        </Confirm>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Open song lyrics"
          title="Open song lyrics"
          onClick={() => void open(song)}
        >
          <ListMusic className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const highlightText = (text: string, ranges: [number, number][]) => {
  if (!ranges.length) return text;
  const parts: (string | React.ReactElement)[] = [];
  let lastEnd = 0;
  for (const [start, end] of ranges.sort((a, b) => a[0] - b[0])) {
    if (start > lastEnd) parts.push(text.slice(lastEnd, start));
    parts.push(
      <mark key={start} className="bg-yellow-200">
        {text.slice(start, end)}
      </mark>,
    );
    lastEnd = end;
  }
  if (lastEnd < text.length) parts.push(text.slice(lastEnd));
  return parts;
};
