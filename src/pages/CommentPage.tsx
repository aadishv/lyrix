import { useMemo } from "react";
import { useQuery } from "convex/react";
import api from "@/cvx";
import { CommentReadonly } from "@/components/comment/CommentView";
import { Input } from "@/components/ui/input";
import { useLibrary, type Comment, type Song } from "@/hooks";
import { useQueryState } from "nuqs";
import Fuse from "fuse.js";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
type IndexedItem = {
  comment: Comment;
  song: Song;
  title: string;
  content: string;
  trackName: string;
  artistName: string;
  albumName: string;
};

export default function CommentPage() {
  const comments = useQuery(api.comments.getUserComments, {});
  const { data: songs, isLoading: songsLoading } = useLibrary({
    withComments: true,
  });

  const [query, setQuery] = useQueryState<string>("query", {
    defaultValue: "",
    parse: (v) => v,
  });

  const songById = useMemo(() => {
    const m = new Map<number, Song>();
    for (const s of songs ?? []) m.set(s.id, s);
    return m;
  }, [songs]);

  const items: IndexedItem[] = useMemo(() => {
    const mkFallback = (id: number): Song => ({
      id,
      name: "",
      trackName: "",
      artistName: "",
      albumName: "",
      duration: 0,
      instrumental: false,
      plainLyrics: "",
      syncedLyrics: "",
    });
    return (comments ?? []).map((c) => {
      // We don't have link target in getUserComments; use original or linked origin for context.
      const ctxSongId = c.song;
      const song = songById.get(ctxSongId) ?? mkFallback(ctxSongId);
      return {
        comment: c,
        song,
        title: c.title.toLowerCase(),
        content: c.content.toLowerCase(),
        trackName: song.trackName.toLowerCase(),
        artistName: song.artistName.toLowerCase(),
        albumName: song.albumName.toLowerCase(),
      };
    });
  }, [comments, songById]);

  const fuse = useMemo(() => {
    if (items.length === 0) return null;
    return new Fuse(items, {
      keys: [
        { name: "title", weight: 0.5 },
        { name: "content", weight: 0.5 },
        { name: "trackName", weight: 0.3 },
        { name: "artistName", weight: 0.2 },
        { name: "albumName", weight: 0.15 },
      ],
      ignoreLocation: true,
      threshold: 0.3,
      includeScore: true,
    });
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return items;
    if (!fuse) return items;
    return fuse.search(q).map((r) => r.item);
  }, [items, fuse, query]);
  const isLoading = comments === undefined || songsLoading;

  return (
    <div className="flex flex-col gap-4 px-16">
      <div className="flex flex-row items-center gap-2 font-serif">
        <h1 className="flex font-serif gap-2">
          <MessageSquare /> Your Comments
        </h1>
        <span className="text-sm text-black/50">
          {isLoading ? "Loading..." : `${filtered.length} result(s)`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search your comments..."
          value={query}
          onChange={(e) => void setQuery(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="grid gap-4">
        {isLoading ? (
         <Skeleton className="h-40 w-full" />
        ) : filtered.length === 0 ? (
          <div className="text-black/50">No comments found.</div>
        ) : (
          filtered.map(({ comment, song }) => (
            <CommentReadonly
              key={`${comment._id}:${comment.linked ?? "base"}:${comment.start}-${comment.end}`}
              comment={comment}
              song={song}
              showSong
            />
          ))
        )}
      </div>
    </div>
  );
}
