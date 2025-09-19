import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/cvx";
import { useElementSelection } from "@/hooks";
import { useMutation, useQuery } from "convex/react";
import { Redirect } from "wouter";
import CommentHighlight from "@/components/comment/CommentHighlight";
import Confirm from "@/components/Confirm";
import { Link, Plus, Save, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { Artist, Track } from "@spotify/web-api-ts-sdk";
import {
  convertMsToMs,
  getCaretCharIndex,
  offsetsToLineNumbers,
} from "@/lib/utils";
import { Id } from "convex/_generated/dataModel";
import { SpotifyLogo } from "@/components/logos";
import { useAtom } from "@xstate/store/react";
import { createAtom } from "@xstate/store";
import CommentView from "@/components/comment/CommentView";
import { toast } from "sonner";
import { selectedComment } from "@/components/comment/state";
import { useQueryState } from "nuqs";
import { partitionIntervals } from "@/lib/partition";

function SongDetails({
  track,
  artists,
  saved,
  id,
}: {
  track: Track;
  artists: Artist[];
  saved: boolean;
  id: Id<"songs_v2">;
}) {
  const saveSong = useMutation(api.v2.library.saveTrack);
  return (
    <div className="flex-shrink-0 z-10 flex flex-row rounded-lg border shadow bg-white relative">
      <div className="p-4 w-full flex flex-col gap-2">
        <div className="text-xl font-bold mx-auto flex gap-2">
          <span className="my-auto">{track.name}</span>
          {track.explicit && (
            <Badge variant="destructive" className="my-auto">
              Explicit
            </Badge>
          )}
          {saved ? (
            <Badge className="my-auto" variant="default">
              Saved
            </Badge>
          ) : (
            <Badge className="my-auto" variant="outline">
              Not saved
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground flex gap-2">
          <div className="flex flex-col w-1/2">
            <div className="mx-auto">
              {artists.map((a) => (
                <img
                  src={a.images[0].url}
                  key={a.id}
                  className="size-[48px] rounded-full"
                ></img>
              ))}
            </div>
            <span className="font-lg w-full text-center">
              <span className="text-foreground/70">{"by "}</span>
              {artists.map((a) => a.name).join(", ")}
            </span>
          </div>

          <div className="flex flex-col w-1/2">
            <img
              src={track.album.images[0].url}
              alt={track.album.name}
              className="w-[48px] h-[48px] mx-auto"
            />
            <span className="font-lg w-full text-center">
              <span className="text-foreground/70">{"of "}</span>
              {track.album.name}
            </span>
          </div>
        </div>
        <div className="gap-2 flex mx-auto">
          {`Duration: ${convertMsToMs(track.duration_ms)}`}
        </div>
      </div>

      <div className="ml-auto gap-[3px] flex m-1">
        {saved ? (
          <>
            <Confirm
              message="Removing this song from your library will permanently delete any comments on it."
              action="Unsave this song"
              onConfirm={() => void saveSong({ track: id })}
            >
              <Button variant="destructive" title="Unsave">
                <Trash />
              </Button>
            </Confirm>
          </>
        ) : (
          <Button
            className=""
            variant="fancy"
            onClick={() => void saveSong({ track: id })}
            title="Save to library"
          >
            <Save />
          </Button>
        )}
        <Button
          aria-label="Open in Spotify"
          title="Open in Spotify"
          variant="fancy"
          asChild
        >
          <a href={track.external_urls.spotify} target="_blank" className="">
            <SpotifyLogo className="size-[24px]" />
          </a>
        </Button>
      </div>
    </div>
  );
}

// function ShareSong({ id }: { id: number }) {
//   const runShare = useMutation(api.share.shareSong);
//   const [link, setLink] = useState(null as string | null);
//   const [isLive, setIsLive] = useState(false);
//   useEffect(() => {
//     void runShare({
//       live: isLive,
//       songId: id
//     }).then(res => setLink(res));
//   }, [id, runShare, isLive]);
//   console.log(isLive);
//   return (
//     <>
//       <DialogHeader>
//         <DialogTitle>Share comments</DialogTitle>
//       </DialogHeader>
//       <div>
//         <div>
//           <input
//             type="radio"
//             id="share-snapshot"
//             name="share-type"
//             value="default"
//             checked={!isLive}
//             onChange={() => setIsLive(false)}
//             className="mr-2"
//           />
//           <label htmlFor="share-snapshot">
//             <b>Share snapshot.</b> It is a snapshot, so changes you make after this will not be mirrored.
//           </label>
//         </div>
//         <div>
//           <input
//             type="radio"
//             id="share-live"
//             name="share-type"
//             value="live"
//             checked={isLive}
//             onChange={() => setIsLive(true)}
//             className="mr-2"
//           />
//           <label htmlFor="share-live">
//             <b>Share live copy.</b> Will update with any and all changes you make to your comments on this song. <em>Cannot be undone.</em>
//           </label>
//         </div>
//       </div>
//       <Suspense fallback={<Skeleton className="w-full h-10" />}>
//         <ShareLinkComponent
//           link={`${window.location.origin.toString()}/song?id=${id}&shared=${link}`}
//         />
//       </Suspense>
//       <DialogFooter>
//         <DialogClose asChild>
//           <Button variant="destructive">Cancel</Button>
//         </DialogClose>
//       </DialogFooter>
//     </>
//   );
// }

function SongPageInternal({ id }: { id: Id<"songs_v2"> }) {
  const data = useQuery(api.v2.library.getSong, { track: id });
  const selected = useAtom(selectedComment);
  const comments = useQuery(
    api.v2.comments.getUserCommentsForSong,
    data ? { songId: id } : "skip",
  );
  const updateComment = useMutation(api.v2.comments.updateComment);
  const deleteComment = useMutation(api.v2.comments.deleteComment);
  // const unlink = useMutation(api.comments.unlinkCommentFromSong);
  const newComment = useMutation(api.v2.comments.newComment);
  const [selection, setSelection] = useState<Range | null>(null);
  useElementSelection({
    id: "song-lyrics",
    setter: (v) => {
      setSelection(v);
    },
  });
  const selectedRect = useMemo(
    () => selection?.getClientRects()[selection?.getClientRects().length - 1],
    [selection],
  );
  const commentRects = useMemo(() => {
    return comments
      ?.map((comment) => {
        const range = document.createRange();
        const node = document.getElementById("song-lyrics");
        if (!node) return undefined;

        range.setStart(node.firstChild!, comment.start);
        range.setEnd(node.firstChild!, comment.end);
        return { rect: range.getBoundingClientRect(), comment };
      })
      ?.filter((v) => v !== undefined);
  }, [comments]);

  // GPT-5 with minor modifications
  const handleMouseUp = (e: React.MouseEvent<HTMLPreElement>) => {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed) return; // Don't interfere with text selection

    const index = getCaretCharIndex(e.currentTarget, e.clientX, e.clientY);
    if (index == null) return;

    const hit = comments?.find((c) => index >= c.start && index < c.end);
    if (hit) {
      selectedComment.set(hit._id);
    } else {
      selectedComment.set(null);
    }
  };
  const top = useMemo(() => {
    const range = document.createRange();
    const node = document.getElementById("song-lyrics");
    if (!node) return undefined;

    range.setStart(node.firstChild!, 0);
    range.setEnd(node.firstChild!, 0);
    return range.getBoundingClientRect().top;
  }, []);
  const selectedCommentDetails = useMemo(() => {
    if (!comments) return undefined;
    if (!selected) return undefined;
    const comment = comments.find((c) => c._id === selected);
    if (!comment) return undefined;
    const range = document.createRange();
    const node = document.getElementById("song-lyrics");
    if (!node) return undefined;

    range.setStart(node.firstChild!, comment.start);
    range.setEnd(node.firstChild!, comment.end);
    return { range, comment };
  }, [comments, selected]);
  const commentRect = useMemo(() => {
    if (!selectedCommentDetails) return undefined;
    const { range } = selectedCommentDetails;
    const rects = range.getClientRects();
    return rects[rects.length - 1];
  }, [selectedCommentDetails]);

  if (data === undefined) {
    return <Skeleton className="h-40 w-full top-15" />;
  } else {
    const {
      track: { track: trackDetails, lyrics, artists },
      saved,
    } = data;
    return (
      <div className="w-full h-full">
        <div className="flex flex-col">
          {/* card */}
          <SongDetails
            {...{ lyrics, artists, track: trackDetails, saved, id }}
          />
          {/* lyrics */}
          <div className="lg:my-10 lg:mx-20">
            <div className="text-sm whitespace-pre-wrap font-mono grid grid-cols-1 grid-rows-1">
              {comments && saved && (
                <CommentHighlight
                  comments={comments}
                  song={data}
                  // TODO: reimplement
                  focused={null}
                />
              )}
              <pre
                onMouseUp={handleMouseUp}
                id="song-lyrics"
                style={{
                  letterSpacing: 0,
                  fontSize: "1.5em",
                  gridArea: "1/1",
                  zIndex: 1,
                }}
              >
                {lyrics}
              </pre>
              {/* button group */}
              {selection && selectedRect && (
                <div
                  className="absolute flex gap-1"
                  style={{
                    top: `calc(${selectedRect.bottom + window.scrollY}px + 1.5em)`,
                    left: `calc(${selectedRect.left + selectedRect.width / 2 + window.scrollX}px - 3rem)`,
                    width: "6rem",
                    zIndex: 2,
                  }}
                >
                  <Button
                    variant="fancy"
                    className="mr-auto"
                    onClick={() =>
                      void newComment({
                        track: id,
                        start: selection.startOffset,
                        end: selection.endOffset,
                      }).then((id) => selectedComment.set(id))
                    }
                  >
                    <Plus />
                  </Button>
                  <Button variant="default">
                    <Link />
                  </Button>
                </div>
              )}
              {selectedCommentDetails && commentRect && (
                <div
                  className="absolute"
                  style={{
                    top: `calc(${commentRect.bottom + window.scrollY}px + 0.5em)`,
                    left: `calc(${commentRect.left + commentRect.width / 2 + window.scrollX}px - 11rem)`,
                    width: "22rem",
                    zIndex: 2,
                  }}
                >
                  <CommentView
                    comment={selectedCommentDetails.comment}
                    deleteComment={() =>
                      void deleteComment({
                        id: selectedCommentDetails.comment._id,
                      })
                    }
                    setComment={(args) =>
                      updateComment({
                        id: selectedCommentDetails.comment._id,
                        ...args,
                      })
                    }
                  />
                </div>
              )}
              {commentRects &&
                partitionIntervals(
                  commentRects.map((item) => {
                    const { startLine, endLine } = offsetsToLineNumbers(
                      lyrics,
                      [item.comment.start, item.comment.end],
                    );
                    return { item, start: startLine, end: endLine };
                  }),
                ).map((ranges, leftward) =>
                  ranges.map(({ item: { comment, rect } }) => {
                    return (
                      <div
                        key={comment._id}
                        className="w-4 rounded-full absolute cursor-pointer"
                        role="button"
                        onClick={() => selectedComment.set(comment._id)}
                        style={{
                          backgroundColor: comment.color,
                          top: `calc(${rect.top}px)`,
                          height: `${rect.height + 6.0}px`,
                          transform: `translateX(calc(-${(leftward + 1.25) * 3/2}rem))`,
                        }}
                      ></div>
                    );
                  }),
                ).flat()}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default function SongPage() {
  const [id] = useQueryState<Id<"songs_v2"> | null>("id", {
    defaultValue: null,
    parse: (v) => v as Id<"songs_v2">,
  });
  // const [shared, setShared] = useQueryState<string | null>("shared", {
  //   defaultValue: null,
  //   parse: v => v,
  // });

  if (!id) {
    return <Redirect to="/404" />;
  }
  // return shared ? <SharedSongPage id={id} link={shared} close={() => void setShared(null)} /> : <SongPageInternal id={id} />;
  return <SongPageInternal id={id} />;
}
