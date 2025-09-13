import { useQuery as useTSQuery } from "@tanstack/react-query";
import api from "@/cvx";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Infer } from "convex/values";
import { commentValidator } from "convex/comments";
import { minimalCommentValidator } from "convex/share";
import { useDebounce } from "@/lib/useDebounce";
import { useAction } from "convex/react";

export type Comment = Infer<typeof commentValidator>;
export type MinimalComment = Infer<typeof minimalCommentValidator>;

export type Song = {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string;
} & {
  isSaved?: boolean;
};

export const useTrackSearch = (query: {
  q: string;
  scope: "all" | "song" | "artist" | "album";
}): {
  isLoading: boolean;
  data: Song[];
} => {
  const { q, scope } = query;
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // Debounce the search query to avoid hitting rate limits
  const debouncedSetQuery = useDebounce((searchQuery: string) => {
    setDebouncedQuery(searchQuery);
  }, 500);

  useEffect(() => {
    debouncedSetQuery(q);
  }, [q, debouncedSetQuery]);

  const library = useQuery(api.library.getLibrary, {});
  const searchTracksAction = useAction(api.musixmatch.searchTracks);
  
  // Build the search query based on scope
  const searchQuery = useMemo(() => {
    if (!debouncedQuery.trim()) return "";
    
    switch (scope) {
      case "song":
        return `track:"${debouncedQuery}"`;
      case "artist":
        return `artist:"${debouncedQuery}"`;
      case "album":
        return `album:"${debouncedQuery}"`;
      case "all":
      default:
        return debouncedQuery;
    }
  }, [debouncedQuery, scope]);

  const { isLoading, data } = useTSQuery({
    queryKey: ["trackSearch", searchQuery, scope],
    queryFn: async () => {
      try {
        const tracks = await searchTracksAction({ query: searchQuery });
        return tracks;
      } catch (error) {
        console.error("Error searching tracks:", error);
        return [];
      }
    },
    enabled: Boolean(searchQuery),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });

  if (!q.trim()) {
    return {
      isLoading: false,
      data: [],
    };
  }
  
  if (isLoading || data == undefined || library == undefined) {
    return {
      isLoading: true,
      data: [],
    };
  }
  
  return {
    isLoading,
    data: data.map((song: Song) => ({
      ...song,
      isSaved: library.includes(song.id),
    })),
  };
};

export const useLibrary = (opts?: {
  withComments?: boolean;
}): {
  isLoading: boolean;
  data: Song[];
} => {
  const library = useQuery(api.library.getLibrary, {
    filterForComments: opts?.withComments,
  });
  const getTrackAction = useAction(api.musixmatch.getTrack);

  const getPromiseForId = async (id: number) => {
    try {
      const track = await getTrackAction({ trackId: id });
      return { ...track, isSaved: true };
    } catch (error) {
      console.error(`Error fetching track ${id}:`, error);
      // Return a minimal song object as fallback
      return {
        id,
        name: "Unknown Song",
        trackName: "Unknown Song",
        artistName: "Unknown Artist", 
        albumName: "Unknown Album",
        duration: 0,
        instrumental: false,
        plainLyrics: "",
        syncedLyrics: "",
        isSaved: true,
      };
    }
  };

  const { isLoading, data } = useTSQuery({
    queryKey: ["userLibrary", library, opts?.withComments],
    queryFn: async () => {
      const data = await Promise.all(library!.map(getPromiseForId));
      return data as Song[];
    },
    enabled: library != undefined,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 2,
  });
  
  if (data == undefined || library == undefined) {
    return {
      isLoading: true,
      data: [],
    };
  }
  
  return {
    isLoading,
    data,
  };
};

export const useSong = (
  id: number | null,
): { isLoading: boolean; data?: Song } => {
  const library = useQuery(api.library.getLibrary, {});
  const getTrackAction = useAction(api.musixmatch.getTrack);
  
  const { isLoading, data } = useTSQuery({
    queryKey: ["song", id],
    queryFn: async () => {
      try {
        const track = await getTrackAction({ trackId: id! });
        return track;
      } catch (error) {
        console.error(`Error fetching song ${id}:`, error);
        throw new Error(`Error fetching song: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    enabled: id != null && library !== undefined,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
  
  return {
    isLoading: isLoading || library === undefined,
    data: data && {
      ...data,
      isSaved: id ? library?.includes(id) || false : false,
    },
  };
};

export const useCommentsForSong = (
  songId: number,
): {
  isLoading: boolean;
  data: Comment[];
} => {
  const comments = useQuery(api.comments.getUserCommentsForSong, { songId });
  return {
    isLoading: comments === undefined,
    data: comments || [],
  };
};

export const useElementSelection = ({
  id,
  setter,
}: {
  id: string;
  setter: (v: Range | null) => void;
}) => {
  useEffect(() => {
    const abortController = new AbortController();
    const handler = () => {
      const docSelection = document.getSelection();
      if (docSelection?.rangeCount == 0 || !docSelection) {
        setter(null);
        return;
      }
      const range = docSelection.getRangeAt(0);
      const start = range.startContainer.parentElement;
      const end = range.endContainer.parentElement;
      if (
        start == end &&
        start?.id == id &&
        range.startOffset < range.endOffset
      ) {
        setter(range ?? null);
      } else {
        setter(null);
      }
    };

    document.addEventListener("selectionchange", handler, {
      signal: abortController.signal,
    });

    return () => {
      abortController.abort();
    };
  }, [id, setter]);
};
