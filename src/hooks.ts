import { useQuery as useTSQuery } from "@tanstack/react-query";
import api from "@/cvx";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { Infer } from "convex/values";
import { commentValidator } from "convex/comments";
import { minimalCommentValidator } from "convex/share";

export type Comment = Infer<typeof commentValidator>;
export type MinimalComment = Infer<typeof minimalCommentValidator>;

export const useLibrary = (opts?: {
  withComments?: boolean;
}): {
  isLoading: boolean;
  data: Song[];
} => {
  const library = useQuery(api.library.getLibrary, {
    filterForComments: opts?.withComments,
  });

  const getPromiseForId = async (id: number) =>
    await fetch(`https://lrclib.net/api/get/${id}`)
      .then((res) => res.json())
      .then(
        (j) =>
          ({
            ...j,
            isSaved: true,
          }) as Song,
      );

  const { isLoading, data } = useTSQuery({
    queryKey: ["userLibrary", library, opts?.withComments],
    queryFn: async () => {
      const data = await Promise.all(library!.map(getPromiseForId));
      return data as Song[];
    },
    enabled: library != undefined,
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
  const { isLoading, data } = useTSQuery({
    queryKey: ["song", id],
    queryFn: async () => {
      const response = await fetch(`https://lrclib.net/api/get/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching song: ${response.statusText}`);
      }
      const song = await response.json();
      return {
        ...song,
      } as Song;
    },
    enabled: id != null && library !== undefined,
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
