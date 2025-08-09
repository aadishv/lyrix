import api from "@/cvx";
import { Song, useLibrary, useCommentsForSong, type Comment } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Accordion,
} from "@/components/ui/accordion";
import { useMutation } from "convex/react";
import { selectionAtom, useCurrentSong } from "@/components/comment/state";
import { useAtom } from "@xstate/store/react";
import { CommentReadonly } from "./CommentView";

function SongComments({ song }: { song: Song }) {
  const [realSong] = useCurrentSong() ?? -1;
  const selection = useAtom(selectionAtom, (c) => c.lastSelection);
  const { isLoading: songIsLoading, data: comments } = useCommentsForSong(
    song.id,
  );
  const linkCommentToSong = useMutation(api.comments.linkCommentToSong);
  const linkComment = (comment: Comment) =>
    void linkCommentToSong({
      commentId: comment._id,
      songId: realSong,
      start: selection!.startOffset,
      end: selection!.endOffset,
    });
  return (
    <>
      <div className="flex flex-col">
        {songIsLoading ? (
          <Skeleton className="w-full h-10" />
        ) : comments.length > 0 ? (
          comments.map((comment) => {
            return (
              <CommentReadonly
                song={song}
                comment={comment}
                closer={() => linkComment(comment)}
              />
            );
          })
        ) : (
          "No comments"
        )}
      </div>
    </>
  );
}

function SongAccordion({ song }: { song: Song }) {
  return (
    <AccordionItem value={`${song.id}`}>
      <AccordionTrigger>
        <span>
          <b className="">{`${song.name}`}</b>
          {` | ${song.albumName} | ${song.artistName}`}
        </span>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-4 text-balance">
        <SongComments song={song} />
      </AccordionContent>
    </AccordionItem>
  );
}

export function CommentChooser() {
  const { isLoading, data: library } = useLibrary({ withComments: true });

  return (
    <div className="grid gap-4 max-h-[75vh] overflow-y-auto">
      <Accordion
        type="single"
        collapsible
        className="w-full"
        defaultValue="item-1"
      >
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : library ? (
          library.map((song) => <SongAccordion key={song.id} song={song} />)
        ) : (
          "No songs with comments in your library."
        )}
      </Accordion>
    </div>
  );
}
